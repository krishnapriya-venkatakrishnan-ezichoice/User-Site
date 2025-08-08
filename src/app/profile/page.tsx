"use client";

import React, { useEffect, useState, ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ClipLoader } from "react-spinners";
import { useAuth } from "@/context/authContext";
import QRCode from "react-qr-code";

interface Profile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
}

interface EditForm {
  full_name: string;
  username: string;
}

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const { userImg } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    full_name: "",
    username: "",
  });
  const [error, setError] = useState<string | null>(null);

  // We'll store the user's email separately so we can show a QR code
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          throw new Error(
            sessionError?.message || "No authenticated user found."
          );
        }

        // Capture the user’s email for the QR code
        setUserEmail(session.user.email ?? "");

        // Fetch the user's profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          throw new Error(profileError.message);
        }

        setProfile(profileData);

        // Initialize the edit form with fetched profile data
        setEditForm({
          full_name: profileData.full_name || "",
          username: profileData.username || "",
        });
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
          router.push("/auth/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [router]);

  const getDefaultForm = (): EditForm => ({
    full_name: profile?.full_name || "",
    username: profile?.username || "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditForm(getDefaultForm());
    setError(null);
  };

  const handleSave = async () => {
    if (!profile) {
      setError("User profile not loaded.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const updatedProfile: Partial<Profile> = {
        full_name: editForm.full_name.trim() || undefined,
        username: editForm.username.trim() || undefined,
      };

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updatedProfile)
        .eq("id", profile.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Refetch the updated profile
      const { data: updatedProfileData, error: refetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profile.id)
        .single();

      if (refetchError) {
        throw new Error(refetchError.message);
      }

      setProfile(updatedProfileData);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <ClipLoader size={50} color="#3b82f6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-md shadow-lg p-6 relative">
        {/* Profile Banner */}
        <div className="w-full h-32 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-md absolute top-0 left-0 z-0" />

        {/* Edit button (absolute in top-right) */}
        {!isEditing && (
          <button
            onClick={handleEditClick}
            className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 z-10"
          >
            Edit Profile
          </button>
        )}

        {/* Profile Content */}
        <div className="relative z-10 mt-20 flex flex-col items-center space-y-4">
          {/* Profile Image */}
          <div className="relative w-24 h-24 rounded-full ring-4 ring-white overflow-hidden">
            <Image
              src={userImg || "/profile.png"}
              alt="User Avatar"
              fill
              className="object-cover"
            />
          </div>

          {/* Basic Profile Info */}
          {!isEditing ? (
            <div className="text-center">
              <h1 className="text-2xl font-bold">
                {profile?.full_name || "Unnamed User"}
              </h1>
              {profile?.username && (
                <p className="text-gray-500">@{profile.username}</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col w-full sm:w-3/4">
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={editForm.full_name}
                onChange={handleChange}
                className="rounded-md border border-gray-300 p-2 mb-4"
                disabled={isSaving}
              />

              <label className="block mb-2 text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={editForm.username}
                onChange={handleChange}
                className="rounded-md border border-gray-300 p-2 mb-4"
                disabled={isSaving}
              />

              {/* Action buttons */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center justify-center"
                  disabled={isSaving}
                >
                  {isSaving ? <ClipLoader size={20} color="#ffffff" /> : "Save"}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 text-black rounded-md hover:bg-gray-400"
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* QR Code for the user's email (if available) */}
          {userEmail && (
            <div className="flex flex-col items-center mt-8">
              <p className="text-sm text-gray-600 mb-2">
                Show this to the shop owner to claim your offers
              </p>
              <div className="bg-white p-2 rounded-md shadow-md">
                <QRCode value={JSON.stringify({ email: userEmail })} />
              </div>
              <p className="text-xs text-gray-500 mt-2 break-words">
                {userEmail}
              </p>
            </div>
          )}

          {/* Error display in edit mode */}
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
