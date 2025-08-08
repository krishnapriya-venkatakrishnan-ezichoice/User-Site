"use client";
import React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Page() {
  const router = useRouter();

  const validationSchema = Yup.object({
    name: Yup.string().required("Required"),
    email: Yup.string().email("Invalid email address").required("Required"),
    password: Yup.string()
      .min(6, "Password must be at least 6 characters")
      .required("Required"),
  });

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      password: "",
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/login`, // Full URL
            data: {
              full_name: values.name,
            },
          },
        });

        if (error) {
          toast.error(error.message, {
            position: "top-right",
            autoClose: 3000,
          });
        } else {
          toast.success("Sign Up successful!", {
            position: "top-right",
            autoClose: 3000,
          });
          router.push("/auth/login");
        }
      } catch (error) {
        console.log(error);
        toast.error("Sign Up failed", {
          position: "top-right",
          autoClose: 3000,
        });
      } finally {
        setSubmitting(false); // Ensure this is called once after async process completes
      }
    },
  });

  return (
    <div className="flex min-h-full flex-col justify-center px-2 py-3 lg:px-8">
      <div className="border-2 sm:mx-auto sm:w-full sm:max-w-sm p-3 rounded-md">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-2 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Register Now
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form onSubmit={formik.handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">
                Full Name
              </label>
              <div className="mt-2">
                <input
                  id="name"
                  name="name"
                  type="text"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.name}
                  autoComplete="name"
                  required
                  className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${
                    formik.touched.name && formik.errors.name
                      ? "ring-red-500"
                      : ""
                  }`}
                />
                {formik.touched.name && formik.errors.name ? (
                  <div className="mt-2 text-sm text-red-600">
                    {formik.errors.name}
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.email}
                  autoComplete="email"
                  className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${
                    formik.touched.email && formik.errors.email
                      ? "ring-red-500"
                      : ""
                  }`}
                />
                {formik.touched.email && formik.errors.email ? (
                  <div className="mt-2 text-sm text-red-600">
                    {formik.errors.email}
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium leading-6 text-gray-900">
                Password
              </label>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.password}
                  autoComplete="current-password"
                  className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${
                    formik.touched.password && formik.errors.password
                      ? "ring-red-500"
                      : ""
                  }`}
                />
                {formik.touched.password && formik.errors.password ? (
                  <div className="mt-2 text-sm text-red-600">
                    {formik.errors.password}
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Sign up
              </button>
            </div>
          </form>

          <p className="mt-10 text-center text-sm text-gray-500">
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
