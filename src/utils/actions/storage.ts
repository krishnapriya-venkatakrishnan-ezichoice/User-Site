'use server'

import { createAdminClient } from '@/lib/supabase';
import { createSessionClient } from '@/lib/supabase-ssr/server';
import { SupabaseClient } from '@supabase/supabase-js';

const environment = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

// This action's sole purpose is to sign up the user and store the files in a temporary bucket. It also passes a reference to these files through the email redirect URL.

export async function signUpWithCredentials(formData: FormData, currentCountryCode: string) : Promise<boolean> {
    
  const fullName = formData.get("fullName") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const phone = formData.get("phone") as string;
        
  const dob = formData.get("dob") as string || null;
  const userType = formData.get("userType") as string;
  const nationalId = formData.get("nationalId") as string;
        
  const addressLine1 = formData.get("addressLine1") as string;
  const addressLine2 = formData.get("addressLine2") as string;
  const city = formData.get("city") as string;
  const country = formData.get("country") as string;
  const zipCode = formData.get("zipCode") as string;
        
  const schoolName = formData.get("schoolName") as string;
  const schoolId = formData.get("schoolId") as string;
  const schoolExpiry = formData.get("schoolExpiry") as string;

  // append files to FormData object
  const profilePic = formData.get("profilePic") as File || null;
  const studentProof = formData.getAll("studentProof") as File[] || null;
  const nationalIdProof = formData.getAll("nationalIdProof") as File[] || null;

  // use the admin client to upload files to the temporary bucket.
  const supabaseAdmin = await createAdminClient();
  const supabaseSession = await createSessionClient();
  
  // unique id for the temporary folder
  const tempUserId = Math.random().toString(36).substring(2);

  // upload files to temp-file-uploads bucket
  const uploadedFiles = [];
  try {
    // Add user profile picture
    if (profilePic instanceof File){
        const filePath = `profile-pics/${tempUserId}/${profilePic.name}`;
        const {data: uploadData, error: uploadError} = await supabaseAdmin.storage
          .from("temp-file-uploads")
          .upload(filePath, profilePic);
      
      if (uploadError)
        throw uploadError;
      uploadedFiles.push(uploadData.path);
    }

    // Add student proof upload if userType is 'student' and file exists
    if (userType === 'student' && Array.isArray(studentProof) && studentProof.length > 0){
      for (const file of studentProof) {
        const filePath = `student-proofs/${tempUserId}/${file.name}`;
        const {data: uploadData, error: uploadError} = await supabaseAdmin.storage
          .from("temp-file-uploads")
          .upload(filePath, file);
          
        if (uploadError)
          throw uploadError;
          
        uploadedFiles.push(uploadData.path);
      }
    };

    // Add National ID proof upload if userType is 'pension' and file exists
    if (userType === 'pension' && Array.isArray(nationalIdProof) && nationalIdProof.length > 0){
      for (const file of nationalIdProof) {
        const filePath = `national-id-proofs/${tempUserId}/${file.name}`;
        const {data: uploadData, error: uploadError} = await supabaseAdmin.storage
          .from("temp-file-uploads")
          .upload(filePath, file);
          
        if (uploadError)
          throw uploadError;
          
        uploadedFiles.push(uploadData.path);
      }
    };
        
  } catch (error: any) {
    throw new Error(`File upload failed: ${error.message}`);
  }

  // sign up
  const { error } = await supabaseSession.auth.signUp({
    email: email,
    password: password,
    options: {
      emailRedirectTo: `${environment}/api/register-form`,
      data: {
        // temporary bucket files
        temp_file_paths: uploadedFiles,

        full_name: fullName,
        phone_number: phone,
        user_type: userType,
        date_of_birth: dob ? new Date(dob)?.toISOString() : null,
        national_id: nationalId || null,
        address_line1: addressLine1,
        address_line2: addressLine2,
        city: city,
        zip_code: zipCode,
        country: currentCountryCode,
        school_name: userType === 'student' ? schoolName : null,
        school_id: userType === 'student' ? schoolId : null,
        school_expiry: userType === 'student' ? schoolExpiry : null,
      }
    }
  })  
  if (error) {
    throw error;
  }
  return true;
  
}

export async function moveTempToPermStorage(supabase: SupabaseClient) : Promise<boolean> {
  const supabaseAdmin = await createAdminClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User not authenticated.");
  }

  try {
    // get the user's temporary file paths from their metadata
    const tempFilePaths = user.user_metadata.temp_file_paths || [];
    
    if (tempFilePaths.length === 0)
      return false;
  
    const moveAndSignPromises = tempFilePaths.map(async (tempPath: string) => {

      let destinationBucket: string;

      // determine the destination bucket based on the temporary path.
      if (tempPath.startsWith("profile-pics"))
        destinationBucket = "profile-pics";
      else if (tempPath.startsWith("student-proofs"))
        destinationBucket = "student-proofs";
      else if (tempPath.startsWith("national-id-proofs"))
        destinationBucket = "national-id-proofs";
      else {
        console.warn(`File with unknown path pattern found: ${tempPath}. Skipping.`);
        return null;
      }

      // construct the new path in the permanent bucket using the user's ID.
      const fileName = tempPath.split("/").pop();
      const newPath = `${user.id}/${fileName}`;
      
      // move the file from the temporary bucket to the correct permanent bucket
      
      const { error: moveError } = await supabaseAdmin.storage
        .from(`temp-file-uploads`)
        .move(tempPath, newPath, {
          destinationBucket: destinationBucket
        });

      if (moveError)
        throw new Error(`Failed to move file ${tempPath}: ${moveError.message}`);

      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
        .from(destinationBucket)
        .createSignedUrl(newPath, 60 * 60 * 24 * 7); // valid for 7 days newUrl is changed to moveUrl

        if (signedUrlError)
          throw new Error(`Failed to create signed URL for ${newPath}: ${signedUrlError.message}`);

        return {
          path: tempPath,
          url: signedUrlData.signedUrl
        }
    });

    // concurrently execute all move and sign operations
    const results = (await Promise.all(moveAndSignPromises))
      .filter(Boolean); // filters null

    if (results.length === 0)
      throw new Error("No files were successfully moved.");

    const permanentFileUrls: {
      profilePicUrl?: string,
      studentProofUrls?: string[],
      nationalIdProofUrls?: string[],
    } = {
      profilePicUrl: "",
      studentProofUrls: [],
      nationalIdProofUrls: [],
    }

    for (const result of results) {
      if (result.path.startsWith("profile-pics"))
        permanentFileUrls.profilePicUrl = result.url;
      if (result.path.startsWith("student-proofs"))
        permanentFileUrls.studentProofUrls?.push(result.url);
      if (result.path.startsWith("national-id-proofs"))
        permanentFileUrls.nationalIdProofUrls?.push(result.url);
    }
    
    
    // Delete the temporary folder
    await supabaseAdmin.storage
      .from("temp-file-uploads")
      .remove(tempFilePaths);

    // update the profiles table with the new URLs
    const {error: updateError} = await supabase
      .from("profiles")
      .update({
        avatar_url: permanentFileUrls.profilePicUrl || null,
        student_proof_url: permanentFileUrls.studentProofUrls,
        national_id_proof_url: permanentFileUrls.nationalIdProofUrls,
      })
      .eq("id", user.id);

    if (updateError)
      throw updateError;

    return true;
  } catch(err){
    console.error(err);
    throw err;
  }
}