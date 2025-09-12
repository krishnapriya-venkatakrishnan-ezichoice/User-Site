"use client";

import { Icon } from "@iconify/react";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { calculateAge, getCities, getCountryData } from "@/utils";
import { GENERAL_SUPPORTED_FORMATS } from "@/utils/constants";
import { createRegistrationValidationSchema, registrationFormInitialValues, registrationFormType } from "@/utils/schemas/registrationForm";
import "react-datepicker/dist/react-datepicker.css";

import EditProfileImage from "@/components/profilePageCom/EditProfileImage";
import { signUpWithCredentials, verifyUsername } from "@/utils/actions/storage";
import Link from "next/link";

export default function Page() {

  // useRouter
  const router = useRouter();
  
  // useState
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [schoolProofUrl, setSchoolProofUrl] = useState<string[] | []>([]);
  const [nationalIdProofUrl, setNationalIdProofUrl] = useState<string[] | []>([]);
  
  const [showPassword, setShowPassword] = useState(false);

  const [isUsernameLoading, setIsUsernameLoading] = useState<boolean>(false);
  const initialMount = useRef(true);

  const [cities, setCities] = useState([...getCities("all")]); // used in City dropdown

  // Get the countries
  const countries = getCountryData();

  // ---- This piece of code should be removed.
  // address.country is now removed. The geographic data is focused only in Sri Lanka. In future address.country will be enabled.
  // Once enabled, the currentCountryCode should be removed.
  // Wherever, currentCountryCode is used, replace with address.country.
  const currentCountryCode = "LK";

  // hook to handle form validation
  const formik = useFormik<registrationFormType>({
    initialValues: registrationFormInitialValues,
    validationSchema: createRegistrationValidationSchema,    
    onSubmit: async (values, {setSubmitting}) => {
      
      setSubmitting(true);
      try{
        const { exists, success, errors } = await verifyUsername(values.username!, "register");
        
        if (exists) {
          formik.setFieldError("username", "Username already taken. Please choose another one.");
          return;
        } else if (!success) {
          formik.setFieldError("username", errors?.[0] || "Error validating username. Please try again.");
          return;
        }
        // Step-1: pass the form data to the server action
        const formData = new FormData();
        formData.append("fullName", values.fullName);
        formData.append("username", values.username!);
        formData.append("email", values.email);
        formData.append("password", values.password);
        formData.append("phone", values.phone);
        if (values.dob)
          formData.append("dob", values.dob?.toISOString());
        formData.append("userType", values.userType);
        formData.append("nationalId", values.nationalId);
        
        formData.append("addressLine1", values.address.addressLine1);
        formData.append("addressLine2", values.address.addressLine2 || "");
        formData.append("city", values.address.city);
        formData.append("country", currentCountryCode);
        formData.append("zipCode", values.address.zipCode);
        
        if (values.userType === "student"){
          formData.append("schoolName", values.school.name);
          formData.append("schoolId", values.school.id);
          if (values.school.expiry)
            formData.append("schoolExpiry", values.school.expiry?.toISOString());
        }

        // append files to FormData object
        if (values.profilePic instanceof File)
          formData.append("profilePic", values.profilePic);

        if (values.userType === "student" && Array.isArray(values.school.proof))
          values.school.proof.forEach(file => formData.append("studentProof", file));

        if (values.userType === "pension" && Array.isArray(values.nationalIdProof))
          values.nationalIdProof.forEach(file => formData.append("nationalIdProof", file));

        const result = await signUpWithCredentials(formData, currentCountryCode);

        if (!result)
          throw new Error("Sign up failed");
        
        // Step-2: Raise success toast, when form submission is successful.
        toast.success("Sign Up successful! Please check your email to verify your account.", {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined
        });

        // Step-3: Redirect to login page
        router.push("/auth/login");
      }
      catch (error: any) {
        // Step-4: Handle errors
        console.error("Sign Up Process Failed:", error);
        toast.error(`Sign Up failed: ${error.message || "An unexpected error occurred. Please try again."}`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined
        });
      } finally {
        // Step-5: Always reset submitting state
        setSubmitting(false); // Ensure this is called once after async process completes
      }
    }
  });

  const generateAndSetUserName = async () => {
    setIsUsernameLoading(true);
    
    let usernameFound = false;
    while(!usernameFound) {
      const letters = 'abcdefghijklmnopqrstuvwxyz';
      const digits = '0123456789';
      const allChars = letters + digits;

      const getRandomChar = (chars: string) => chars.charAt(Math.floor(Math.random() * chars.length));
      
      let chars = [
        getRandomChar(letters),
        getRandomChar(digits),
        ...Array.from({length: 3}, () => getRandomChar(allChars))
      ];

      const shuffledUsername = chars.sort(() => 0.5 - Math.random()).join('');
      
      const { exists, success, errors } = await verifyUsername(shuffledUsername, "register");
        
      if (!exists && success) {
        formik.setFieldValue("username", shuffledUsername);
        usernameFound = true;
      } else if (!success) {
        console.error("Error checking username existence:", errors);
        formik.setFieldError("username", errors?.[0] || "Error validating username. Please try again.");
        usernameFound = true; // To avoid infinite loop in case of error  
      }
      
    }
    setIsUsernameLoading(false);
  }

  useEffect(() => {
    const handleUsernameCheck = async () => {
      if (!formik.values.username)
        generateAndSetUserName();
    }
    
    if (initialMount.current) {
      handleUsernameCheck();
      initialMount.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useEffect-1: Populate city, phone code when country is changed
  useEffect(() => {
    // if (!formik.values.address.country){
    if (!currentCountryCode) {
      setCities([...getCities("all")]);
      formik.setFieldValue("address.city", "");
      return
    }

    // const codeIndex = countries.findIndex((country) => country.code === formik.values.address.country);
    const codeIndex = countries.findIndex((country) => country.code === currentCountryCode);

    if(codeIndex !== -1){
      setCities(countries[codeIndex].cities);
    }

    // }, [formik.values.address.country]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCountryCode]);

  // useEffect-2: Populate country, when the city is selected.
  useEffect(() => {
    if (!formik.values.address.city)
      return
    
    const codeIndex = countries.findIndex((country) => country.cities.includes(formik.values.address.city));

    if (codeIndex !== -1) {
      // if (formik.values.address.country !== countries[codeIndex].code)
      if (currentCountryCode !== countries[codeIndex].code)
        formik.setFieldValue("address.country", countries[codeIndex].code);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.address.city]);

  // useEffect-3: Set user type for pension users, when age is >= 60
  useEffect(() => {
    if (!formik.values.dob) return;
    const age = calculateAge(formik.values.dob);
    if (age >= 60) {
      if (formik.values.userType === "general")
        formik.setFieldValue("userType", "pension");
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.dob]);

  // useEffect-4: To render the profile picture
  useEffect(() => {

    if (formik.values.profilePic) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrl(reader.result as string);
      }
      reader.readAsDataURL(formik.values.profilePic);
    } else {
      setImagePreviewUrl(null);
    }

  }, [formik.values.profilePic]);

  // useEffect-5: To render the school proof
  useEffect(() => {

    const files = formik.values.school?.proof;
    const newUrls: string[] = [];

    if (files && files.length > 0) {
      files.forEach(file => {
        newUrls.push(URL.createObjectURL(file))
      });
      setSchoolProofUrl(newUrls);
      
      return () => {
        newUrls.forEach(url => URL.revokeObjectURL(url));
      }
    } else {
      setSchoolProofUrl([]);
    }

  }, [formik.values.school?.proof]);

  // useEffect-6: To render the nic proof
  useEffect(() => {
    const files = formik.values.nationalIdProof;
    const newUrls: string[] = [];

    if (files && files.length > 0) {
      files.forEach(file => {
        newUrls.push(URL.createObjectURL(file))
      });
      setNationalIdProofUrl(newUrls);
      
      return () => {
        newUrls.forEach(url => URL.revokeObjectURL(url));
      }
    } else {
      setNationalIdProofUrl([]);
    }

  }, [formik.values.nationalIdProof]);

  const setProfilePic = async (profilePic: File | string| null) => {
    formik.setFieldValue("profilePic", profilePic);
    formik.setTouched({profilePic: true});
    setTimeout(() => {
      formik.validateField("profilePic")
    }, 0);
      
  }
  
  const blurProfilePic = (event: React.FocusEvent<HTMLInputElement>) => {
    formik.handleBlur(event);
  }

  // Helper function for rendering file input sections
  const renderFileInput = (
    fieldName: keyof registrationFormType | 
      `school.${keyof registrationFormType['school']}` | 
      `nationalIdProof.${keyof registrationFormType['nationalIdProof']}`,
    mandatory: boolean,
    labelText: string,
    previewUrl: string[] | [],
  ) => {
    
    const files = formik.getFieldProps(fieldName).value as File[] | null;
    const touched = formik.getFieldMeta(fieldName).touched;
    const error = formik.getFieldMeta(fieldName).error;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newFiles = event.currentTarget.files;
      const currentFiles = files || [];

      if (newFiles) {
        const updatedFiles = newFiles.length > 0 
          ? [...currentFiles, ...Array.from(newFiles)]
          : currentFiles;
        formik.setFieldValue(fieldName, updatedFiles);
      }

      // Trigger validation
      setTimeout(() => {
        formik.validateField(fieldName as string)
      }, 0);
    }

    const handleDeleteFile = (fileToDelete: File) => {
      const updatedFiles = files?.filter(file => file !== fileToDelete);
      
      const finalFiles = updatedFiles && updatedFiles.length > 0 ? updatedFiles : null;
      formik.setFieldValue(fieldName, finalFiles);
      
      // Trigger validation
      setTimeout(() => {
        formik.validateField(fieldName as string)
      }, 0);
    }
    
    return (
      <div>
        <label htmlFor={fieldName} className="block text-sm font-medium leading-6 text-gray-900">
          {labelText} {mandatory && <span className="text-red-600">*</span>}
        </label>
        <input
          id={fieldName as string}
          name={fieldName as string}
          type="file"
          multiple
          accept={GENERAL_SUPPORTED_FORMATS.join(",")}
          onChange={handleFileChange}
          onBlur={formik.handleBlur}
          autoComplete="off"
          className="hidden" // hiding the default browser behavior
        />
        <div className="flex items-center justify-between gap-4">
          <label htmlFor={fieldName as string} className={`flex-1 rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 cursor-pointer ${
              touched && error
                ? "ring-red-500"
                : ""
            }`}>Choose Files</label>
          {files && files.length > 0 && <span className="text-sm pr-2">{`${files.length} file${files.length === 1 ? "" : "s"}`}</span>}
        </div>
        {touched && error && (
          <div className="mt-1 text-sm text-red-600">
            {error}
          </div>
        )}
        
        {/* Render the list of selected files */}
        {files && files.length > 0 && (
          <div className="mt-1 space-y-1">
            {files.map((file, index) => {
              const url = previewUrl[index];
              return (
                <div key={file.name + index} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex-1 overflow-hidden">
                    {url ? <Link href={url} target="_blank" className="text-sm text-indigo-600 truncate">{file.name}</Link>
                    : (
                      <span className="text-sm text-gray-600 truncate">{file.name}</span>
                    )}
                  </div>
                  <button
                  type="button"
                  onClick={() => handleDeleteFile(file)}
                  className="ml-2 text-red-500 hover:text-red-700 focus:outline-none cursor-pointer">
                    <Icon icon="bi:x" className="text-2xl cursor-pointer" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Helper function for rendering text/date/tel inputs
  const renderInputField = (
    id: string,
    mandatory: boolean,
    label: string,
    type: string = 'text',
    autoComplete: string = 'off',
    path: string = '',
    isPassword?: boolean
  ) => {
    const formikFieldName = path ? `${path}.${id}` : id;
    const value = formik.getFieldProps(formikFieldName).value;
    const touched = formik.getFieldMeta(formikFieldName).touched;
    const error = formik.getFieldMeta(formikFieldName).error;

    const inputClasses = `block w-full rounded-md border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${touched && error ? "ring-red-500": ""}`;

    const inputType = isPassword ? (showPassword ? 'text': 'password') : type;

    const datePickerMinDate = formikFieldName === "school.expiry" ? new Date() : undefined;
    const datePickerMaxDate = formikFieldName === "dob" ? new Date() : undefined;

    return (
      <div className="relative">
        <label htmlFor={formikFieldName} className="block text-sm font-medium leading-6 text-gray-900">
          <div className="flex items-center justify-between">
            <div>
            {label} {mandatory && <span className="text-red-600">*</span>}
            </div>
            {formikFieldName === "username" && (
              <button
                type="button"
                onClick={generateAndSetUserName}
                className={`px-2 py-1.5 flex items-center text-gray-400 focus:outline-none hover:text-indigo-500 relative`}
              >
                {!isUsernameLoading && <Icon icon="carbon:renew" className="text-xl absolute -top-2 right-2" />}
              </button>
            )}
          </div>
        </label>
        <div className="">
          {type === "date" ? (
            <DatePicker
              id={formikFieldName}
              name={formikFieldName}
              selected={value instanceof Date ? value : (value ? new Date(value): null)}
              onChange={(date) => {
                if (date) {
                  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                  formik.setFieldValue(formikFieldName, utcDate);
                } else {
                  formik.setFieldValue(formikFieldName, null);
                }
              }}
              onBlur={() => formik.setFieldTouched(formikFieldName, true)}
              dateFormat="yyyy-MM-dd"
              placeholderText="YYYY-MM-DD"
              showYearDropdown
              showMonthDropdown
              scrollableYearDropdown
              yearDropdownItemNumber={formikFieldName === "dob" ? 150 : 10}
              minDate={datePickerMinDate}
              maxDate={datePickerMaxDate}
              autoComplete={autoComplete}
              className={`${inputClasses} `}
              />
          ) : type === "tel" ? (
            <div className="flex items-center">
              <input
                id={formikFieldName}
                name={formikFieldName}
                type="text"
                value={value}
                onBlur={formik.handleBlur}
                onChange={(e) => {
                  const sanitizedValue = "+" + e.target.value.replace(/[^+0-9]/g, "").replace(/\+/g, "");
                  formik.setFieldValue(formikFieldName, sanitizedValue);
                }}
                autoComplete={autoComplete}
                className={inputClasses}
              />
            </div>
          ): (
            <div className="flex items-center justify-end">
            <input
              id={formikFieldName}
              name={formikFieldName}
              type={inputType}
              onChange={(e) => {
                if (formikFieldName === "username"){
                  const lowercasedValue = e.target.value.toLowerCase();
                  formik.setFieldValue(formikFieldName, lowercasedValue);
                } else {
                  formik.handleChange(e);
                }
              }}
              onBlur={formik.handleBlur}
              value={value}
              autoComplete={autoComplete}
              className={`${inputClasses} ${isPassword ? "hide-password-toggle": ""}`}
            />
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`px-2 py-1.5 flex items-center text-gray-400 focus:outline-none`}
              >
                {showPassword ? (
                  <Icon icon="bi:eye-slash" className="text-2xl"/>
                ): (
                  <Icon icon="bi:eye" className="text-2xl" />
                )}
              </button>
            
            )}
            </div>
          )}
          
          {touched && error ? (
            <div className="mt-1 text-sm text-red-600">
              {error}
            </div>
          ): null}
          
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-full flex-col justify-center px-2 py-3 lg:px-8 border border-gray-200 rounded-lg shadow-lg max-w-5xl mx-auto bg-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-2 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Register Now
        </h2>
      </div>

      <div className="p-3 rounded-md">
        <div className="mt-2">
          <form onSubmit={formik.handleSubmit} className="space-y-1 max-w-5xl mx-auto  grid grid-cols-1 md:grid-cols-2 md:gap-2">
            
            {/* Profile picture */}
            <div className="md:col-span-2 flex flex-col items-center">
              <div className="flex flex-col items-center gap-2">
                <EditProfileImage 
                  prevProfile={null}
                  setProfilePic={setProfilePic}
                  blurProfilePic={blurProfilePic}
                  imagePreviewUrl={imagePreviewUrl}
                />
              </div>
              {formik.touched.profilePic && formik.errors.profilePic ? (
                <div className="mt-1 text-sm text-red-600">
                  {formik.errors.profilePic}
                </div>
              ) : null}
              
            </div>

            {/* Common fields */}
            <h3 className="md:col-span-2 font-semibold text-gray-300 pt-4 uppercase">Basic Information</h3>
            {renderInputField("fullName", true, "Full Name", "text", "name")}
            {renderInputField("username", true, "Username", "text", "username")}
            {renderInputField("email", true, "Email Address", "email", "email")}
            {renderInputField("password", true, "Password", "password", "new-password", "", true)}
            {renderInputField("confirmPassword", true, "Confirm Password", "password", "new-password", "", true)}
            {renderInputField("phone", true, "Phone Number", "tel", "tel")}
            {renderInputField("dob", true, "Date of Birth", "date", "bday")}

            {/* User Type section */}
            <div className="">
              <label htmlFor="userType" className="block text-sm font-medium leading-6 text-gray-900">
                User Type <span className="text-red-600">*</span>
              </label>
              <div className="">
                <select
                  id="userType"
                  name="userType"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.userType}
                  autoComplete="off"
                  className={`block w-full rounded-md border-0 py-2 px-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${
                    formik.touched.userType && formik.errors.userType
                    ? "ring-red-500"
                    : ""
                  }`}
                >
                  <option value="general" disabled={formik.values.dob ? calculateAge(formik.values.dob) >= 60 : false}>General</option>
                  <option value="pension" disabled={formik.values.dob ? calculateAge(formik.values.dob) < 60 : false}>Pension</option>
                  <option value="student" disabled={formik.values.dob ? calculateAge(formik.values.dob) >= 60 : false}>Student</option>
                </select>
                {formik.touched.userType && formik.errors.userType ? (
                  <div className="mt-1 text-sm text-red-600">
                    {formik.errors.userType}
                  </div>
                ) : null}
              </div>
            </div>
            
            {/* NIC ID */}
            {renderInputField("nationalId", formik.values.userType === "pension", "National ID", "text", "off")}
                        
            {/* conditional fields for Student */}
            {formik.values.userType === "student" && (<div className="md:col-span-2 border p-6 rounded-lg shadow-sm bg-green-50 space-y-1">
              <h3 className="md:col-span-2 font-semibold text-gray-800 uppercase">Student Details</h3>
              {renderInputField("name", true, "Name of the School / University", "text", "off", "school")}
              {renderInputField("id", true, "Student ID", "text", "off", "school")}
              {renderFileInput("school.proof", true, "Offer letter/ Registration Card/ Proof", schoolProofUrl)}
              {renderInputField("expiry", true, "Proof Expiry Date", "date", "off", "school")}
            </div>)}

            {/* conditional fields for pension user */}
            {formik.values.userType === "pension" && (<div className="md:col-span-2 border p-6 rounded-lg shadow-sm bg-green-50 space-y-1">
              <h3 className="md:col-span-2 font-semibold text-gray-800 uppercase">Pension User Details</h3>
              {renderFileInput("nationalIdProof", true, "National ID Proof", nationalIdProofUrl)}
            </div>)}


            {/* Address fields */}
            <h3 className="md:col-span-2 font-semibold text-gray-300 pt-4 uppercase">Address Information</h3>
            {renderInputField("addressLine1", true, "Address Line 1", "text", "address-line1", "address")}
            {renderInputField("addressLine2", false, "Address Line 2 (Optional)", "text", "address-line2", "address")}
            
            <div>
              <label htmlFor="address.city" className="block text-sm font-medium leading-6 text-gray-900">
                City <span className="text-red-600">*</span>
              </label>
              <select
                id="address.city"
                name="address.city"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.address.city}
                autoComplete="address-level2"
                className={`block w-full rounded-md border-0 py-2 px-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${
                  formik.touched.address?.city && formik.errors.address?.city
                    ? "ring-red-500"
                    : ""
                }`}
              >
                <option value={""}>Select a city</option>
                {
                  cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))
                }
              </select>
              {formik.touched.address?.city && formik.errors.address?.city ? (
                <div className="mt-1 text-sm text-red-600">
                  {formik.errors.address.city}
                </div>
              ) : null}
            </div>

            {/* address.country- future purpose */}
            {/* <div>
              <label htmlFor="address.country" className="block text-sm font-medium leading-6 text-gray-900">
                Country <span className="text-red-600">*</span>
              </label>
              <select
                id="address.country"
                name="address.country"
                onChange={formik.handleChange}
                value={formik.values.address.country}
                onBlur={formik.handleBlur}
                autoComplete="country"
                className={`block w-full rounded-md border-0 py-2 px-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${
                  formik.touched.address?.country && formik.errors.address?.country
                    ? "ring-red-500"
                    : ""
                }`}
              >
                <option value={""}>Select a country</option>
                {
                  countries.map((country) => (
                    <option key={country.code} value={country.code} className="leading-6">
                      {country.name} ({country.code})
                    </option>
                  ))
                }
              </select>
              {formik.touched.address?.country && formik.errors.address?.country ? (
                <div className="mt-1 text-sm text-red-600">
                  {formik.errors.address.country}
                </div>
              ) : null}
            </div> */}

            {renderInputField("zipCode", true, "Zip / Postal Code", "text", "postal-code", "address")}
            
            {/* Sign up button */}
            <div className="col-span-full">
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-indigo-600 p-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 max-w-lg mx-auto"
              >
                Sign up
              </button>
            </div>
          </form>

          {/* Login Link */}
          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an Account?{" "}
            <a
              href="/auth/login"
              className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500"
            >
              Login
            </a>
          </p>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
