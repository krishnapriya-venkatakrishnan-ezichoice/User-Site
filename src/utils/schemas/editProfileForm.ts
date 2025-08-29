import * as Yup from "yup";
import { calculateAge } from "../ageCalculator";
import { FILE_SIZE_LIMIT, GENERAL_SUPPORTED_FORMATS, IMAGE_SUPPORTED_FORMATS } from "../constants";

export interface editFormType {
  profilePic: string | File | null,
  fullName: string,
  email: string,
  password: string,
  confirmPassword: string,
  address: {
    addressLine1: string,
    addressLine2?: string,
    city: string,
    zipCode: string,
    // country: string
  },
  phone: string,
  userType: string,
  dob: Date | null,
  nationalId: string,
  school: {
    name: string,
    id: string,
    proof: string[] | File[] | null,
    expiry: Date | null
  },
  nationalIdProof: string[] | File[] | null,
}

export const editFormInitialValues = {
  profilePic: "",
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  address: {
    addressLine1: "",
    addressLine2: "",
    city: "",
    zipCode: "",
    // country: "",
  },
  phone: "",
  userType: "",
  dob: null,
  nationalId: "",
  school: {
    name: "",
    id: "",
    proof: [],
    expiry: null
  },
  nationalIdProof: null
}

export const setDefaultValuesInEditForm = (data: Profile, userEmail: string, setDefaultValues : (data: editFormType) => void) => {
  setDefaultValues({
    profilePic: data.avatar_url || "",
    fullName: data.full_name!,
    email: data.email || userEmail,
    password: data.password || "",
    confirmPassword: data.password || "",
    address: {
      addressLine1: data.address_line1 || "",
      addressLine2: data.address_line2 || "",
      city: data.city || "",
      zipCode: data.zip_code || "",
      // country: ""
    },
    phone: data.phone_number || "",
    userType: data.user_type || "general",
    dob: data.date_of_birth ? new Date(data.date_of_birth) : null,
    nationalId: data.national_id || "",
    school: {
      name: data.school_name || "",
      id: data.school_id || "",
      proof: data.student_proof_url || null,
      expiry: data.school_expiry ? new Date(data.school_expiry) : null
    },
    nationalIdProof: data.national_id_proof_url || null
  });
}

// Yup Schema for image file upload
  const getImageFileSchema = (provider: string) => {
    const imageFileSchema = Yup.mixed()
      .nullable()
      .test(
        "fileSize",
        "File too large (max 2MB)",
        function (value) {
          if (value === null || value === undefined) return true; 
          if (value instanceof File) {
            return value.size <= FILE_SIZE_LIMIT;
          } else if (typeof value === "string")
            return true;
          return false
        }
      )
      .test(
        "fileFormat",
        "Unsupported file format (only JPG, JPEG, GIF, PNG)",
        function (value) {
          if (value === null || value === undefined) return true;
          if (value instanceof File) {
            return IMAGE_SUPPORTED_FORMATS.includes(value.type);
          } else if (typeof value === "string")
            return true;
          return false;
        }
      )
      return imageFileSchema;
  }

// Yup Schema for password
  const getPasswordSchema = (provider: string) => {
    const passwordSchema = Yup.string()
      .min(6, "Password must be at least 6 characters")
      .matches(/[a-z]+/, "Password must contain at least one lowercase letter")
      .matches(/[A-Z]+/, "Password must contain at least one uppercase letter")
      .matches(/\d+/, "Password must contain at least one digit")
      .test(
        "password-required",
        "Password is required",
        function (value) {
          if (!value && provider === "email") return false;
          return true;
        }
      );
    
      return passwordSchema;
  }  

// Yup Schema for proof file upload
const proofFileSchema = Yup.array()
  .nullable() 
  .test(
    "fileSize",
    "File too large (max 2MB)",
    function (value) {
      if (!value) return true;
      return value.every(item => {
        if (item instanceof File) {
          return item.size <= FILE_SIZE_LIMIT;
        } else if (typeof item === "string")
          return true;
        return false
      })
    }
  )
  .test(
    "fileFormat",
    "Unsupported file format (only JPG, JPEG, GIF, PNG, PDF, DOC, DOCX, TXT)",
    function (value) {
      if (!value) return true;
      return value.every(item => {
        if (item instanceof File) {
          return GENERAL_SUPPORTED_FORMATS.includes(item.type);
        } else if (typeof item === "string")
          return true;
        return false;
      })
    }
  )

// Yup Schema for Address
const addressSchema = Yup.object().shape({
  addressLine1: Yup.string().required("Address Line 1 is required"),
  addressLine2: Yup.string().optional(),
  city: Yup.string().required("City is required"),
  zipCode: Yup.string().required("Zip / Postal Code is required"),
  // country: Yup.string().required("Country is required")
});

// Yup Schema for School Details (re-uses proofFileSchema)
const schoolSchema = Yup.object({
  name: Yup.string()
    .required("School/ University Name is required"),
  id: Yup.string()
    .required("School/ University ID is required"),
  proof: proofFileSchema
    .required("Proof is required"),
  expiry: Yup.date()
    .required("Expiry date is required")
    .min(new Date(), "Expiry date cannot be in the past")
});


export const editProfileFormValidationSchema = (provider: string) => {
  return Yup.object().shape({
    profilePic: getImageFileSchema(provider),
    fullName: Yup.string()
      .required("Full Name is required"),
    address: addressSchema,
    phone: Yup.string()
      .required("Phone number is required")
      .test(
        "phone-number-required",
        "Phone number is required",
        function(value) {
          if (!value || value === '+') 
            return false;
          return true;
        }
      ),
    email: Yup.string()
      .email("Invalid email address")
      .required("Email address is required"),
    password: getPasswordSchema(provider),
    confirmPassword: Yup.string()
      .when("password", {
        is: (password: string) => !!password,
        then: (schema) => schema.required("Confirm password is required"),
        otherwise: (schema) => schema.notRequired()
      })
      .oneOf([Yup.ref("password")], "Passwords must match"),
    userType: Yup.string()
      .required("User type is required")
      .when("dob", {
        is: (dob: Date) => {
          if (!dob) return false;
          return calculateAge(dob) < 60;
        },
        then: (schema) => schema.notOneOf(["pension"], "Age is less than 60 for Pension User.")
      })
      .when("dob", {
        is: (dob: Date) => {
          if (!dob) return false;
          return calculateAge(dob) >= 60;
        },
        then: (schema) => schema.notOneOf(["student", "general"], `Type cannot be "Student" or "General" for an age of 60 or older.`)
      }),
    dob: Yup.date()
      .required("Date of birth is required")
      .max(new Date(), "Date of birth cannot be in the future"),
    nationalId: Yup.string()
      .when("userType", {
        is: "pension",
        then: (schema) => schema.required("National ID is required for pension users"),
        otherwise: (schema) => schema.nullable().strip(),
      }),
    school: Yup.object()
      .when("userType", {
        is: "student",
        then: (schema) => schoolSchema.required("Student details are required"),
        otherwise: (schema) => schema.nullable().strip(),
      }),
    nationalIdProof: proofFileSchema
      .when("userType", {
        is: "pension",
        then: (schema) => schema.required("National ID Proof is required"),
        otherwise: (schema) => schema.nullable(),
      })
  });
}; 