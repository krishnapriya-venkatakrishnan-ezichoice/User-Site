import * as Yup from "yup";
import { calculateAge } from "../ageCalculator";
import { FILE_SIZE_LIMIT, GENERAL_SUPPORTED_FORMATS, IMAGE_SUPPORTED_FORMATS } from "../constants";

// address.country is commented- will be used in future.

export interface registrationFormType {
  profilePic: File | null,
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
    proof: File[] | null,
    expiry: Date | null
  },
  nationalIdProof: File[] | null,
}

export const registrationFormInitialValues = {
  profilePic: null,
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  address: {
    addressLine1: "",
    addressLine2: "",
    city: "",
    zipCode: "",
    // country: ""
  },
  phone: "",
  userType: "general",
  dob: null,
  nationalId: "",
  school: {
    name: "",
    id: "",
    proof: null,
    expiry: null
  },
  nationalIdProof: null
};

// Yup Schema for image file upload
const imageFileSchema = Yup.mixed()
  .nullable()
  .test(
    "fileSize",
    "File too large (max 2MB)",
    function (value) {
      if (value === null || value === undefined) return true; 
      if (value instanceof File) {
        return value.size <= FILE_SIZE_LIMIT;
      }
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
      }
      return false;
    }
  )

// Yup Schema for proof file upload
const proofFileSchema = Yup.array()
  .nullable() 
  .test(
    "fileSize",
    "File too large (max 2MB)",
    function (value) {
      if (!value) return true;
      return value.every(file => file.size <= FILE_SIZE_LIMIT)
    }
  )
  .test(
    "fileFormat",
    "Unsupported file format (only JPG, JPEG, GIF, PNG, PDF, DOC, DOCX, TXT)",
    function (value) {
      if (!value) return true;
      return value.every(file => GENERAL_SUPPORTED_FORMATS.includes(file.type)); 
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


export const createRegistrationValidationSchema = () => {
  return Yup.object().shape({
    profilePic: imageFileSchema,
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
    password: Yup.string()
      .min(6, "Password must be at least 6 characters")
      .matches(/[a-z]+/, "Password must contain at least one lowercase letter")
      .matches(/[A-Z]+/, "Password must contain at least one uppercase letter")
      .matches(/\d+/, "Password must contain at least one digit")
      .required("Password is required"),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password")], "Passwords must match")
      .required("Confirm Password is required"),
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