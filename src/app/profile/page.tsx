"use client";

import EditProfile from "@/components/profilePageCom/EditProfile";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { ClipLoader } from "react-spinners";

interface Profile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
}

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const { userImg, provider } = useAuth();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [profile, setProfile] = useState<Profile | null>(null);

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

  const handleEditClick = () => {
    setIsEditing(true);
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
      <div className="max-w-5xl mx-auto bg-white rounded-md shadow-lg p-6 relative">
        {/* Profile Banner */}
        <div className="w-full h-32 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-md absolute top-0 left-0 z-0" />

        {/* Edit button (absolute in top-right) */}
        {!isEditing && (
          <div className="absolute top-4 right-4 z-10 flex items-center gap-4 justify-center">
            <button
              onClick={handleEditClick}
              className=" bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 "
            >
              Edit Profile
            </button>
            {provider === "email" && <Link
            href="/auth/forgot-password?from=profile_page"
            className=" bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 "
            >Change password</Link>}
          </div>
        )}

        {/* Profile Content */}
        <div className="relative z-10 mt-20 flex flex-col items-center space-y-4">
          

          {/* Basic Profile Info */}
          {!isEditing ? (
            <>
              {/* Profile Image */}
              <div className="relative w-24 h-24 rounded-full ring-4 ring-white overflow-hidden">
                <Image
                  src={userImg || "/profile.png"}
                  alt="User Avatar"
                  fill
                  className="object-cover"
                />
              </div>
            
              <div className="text-center">
                <h1 className="text-2xl font-bold">
                  {profile?.full_name || "Unnamed User"}
                </h1>
                {profile?.username && (
                  <p className="text-gray-500">@{profile.username}</p>
                )}
              </div>
            </>
          ) : profile?.id && (
            <EditProfile userId={profile?.id} userEmail={userEmail} provider={provider} setIsEditing={setIsEditing} />
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
          
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
