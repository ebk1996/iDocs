import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from "react";
import db, { auth, storage } from "../firebase";
import Head from "next/head";
import { useRouter } from "next/router";
import { sendPasswordResetEmail } from "firebase/auth";

const Profile = () => {
  const [user, loading] = useAuthState(auth);
  const [profile, setProfile] = useState({ username: "", number: "", email: "" });
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ username: "", number: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user && !loading) router.push("/");
    if (user) {
      db.collection("users").doc(user.email).get().then(doc => {
        if (doc.exists) {
          setProfile(doc.data());
          setForm({ username: doc.data().username || "", number: doc.data().number || "" });
        }
      });
    }
  }, [user, loading]);

  const validateForm = () => {
    if (!form.username.trim()) return "Username is required.";
    if (!/^\d{12}$/.test(form.number)) return "12-digit number required.";
    return null;
  };

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError("");
  };

  // Helper to generate a random 12-digit number as a string
  function generate12DigitNumber() {
    return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError("");
    let newNumber = form.number;
    if (!/^\d{12}$/.test(newNumber)) {
      newNumber = generate12DigitNumber();
      setForm((f) => ({ ...f, number: newNumber }));
    }
    const err = validateForm();
    if (err) return setFormError(err);
    setFormLoading(true);
    try {
      // Check for unique username/number (if changed)
      if (form.username !== profile.username) {
        const usernameSnap = await db.collection("users").where("username", "==", form.username).get();
        if (!usernameSnap.empty) throw new Error("Username already taken.");
      }
      if (newNumber !== profile.number) {
        const numberSnap = await db.collection("users").where("number", "==", newNumber).get();
        if (!numberSnap.empty) throw new Error("12-digit number already in use.");
      }
      // Try update, fallback to set if doc doesn't exist
      try {
        await db.collection("users").doc(user.email).update({
          username: form.username,
          number: newNumber,
        });
      } catch (err) {
        if (err.message && err.message.includes("No document to update")) {
          await db.collection("users").doc(user.email).set({
            email: user.email,
            username: form.username,
            number: newNumber,
            createdAt: new Date(),
          });
        } else {
          throw err;
        }
      }
      setProfile({ ...profile, username: form.username, number: newNumber });
      setEdit(false);
    } catch (err) {
      setFormError(err.message);
    }
    setFormLoading(false);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const storageRef = storage.ref(`profileImages/${user.email}`);
      await storageRef.put(file);
      const url = await storageRef.getDownloadURL();
      await db.collection("users").doc(user.email).update({ photoURL: url });
      setProfile((p) => ({ ...p, photoURL: url }));
    } catch (err) {
      setFormError("Failed to upload image.");
    }
    setUploadingImg(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetMsg("");
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail || user.email);
      setResetMsg("Password reset email sent!");
    } catch (err) {
      setResetMsg("Failed to send reset email.");
    }
    setResetLoading(false);
  };

  if (!user) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-gray-50">
      <Head>
        <title>Profile</title>
      </Head>
      <div className="bg-white p-8 rounded shadow w-96 mt-10">
        <h2 className="text-2xl font-bold mb-4 text-blue-700">Profile</h2>
        <div className="flex flex-col items-start mb-4 relative" style={{ width: 60, height: 60 }}>
          <label htmlFor="profile-img-upload" className="cursor-pointer relative block" style={{ width: 60, height: 60 }}>
            <img
              src={profile.photoURL || user.photoURL || "/default-avatar.png"}
              alt="Profile"
              className="rounded-full object-cover border border-gray-200"
              style={{ width: 60, height: 60 }}
            />
            <span
              className="absolute bottom-0 right-0 w-7 h-7 flex items-center justify-center rounded-full bg-transparent border border-transparent text-blue-600 text-lg font-bold transition hover:bg-white hover:border-blue-400 hover:shadow hover:text-blue-700"
              style={{ pointerEvents: 'auto' }}
            >
              +
            </span>
            <input
              id="profile-img-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={uploadingImg}
            />
          </label>
          {uploadingImg && <div className="text-xs text-gray-500 mt-1">Uploading...</div>}
        </div>
        <div className="mb-4 flex items-center gap-2">
          <input
            type="radio"
            id="reset-password"
            checked={showReset}
            onChange={() => setShowReset((v) => !v)}
            className="form-radio text-blue-600"
          />
          <label htmlFor="reset-password" className="text-sm text-gray-700 cursor-pointer">Reset Password</label>
        </div>
        {showReset && (
          <form onSubmit={handleResetPassword} className="mb-4 flex flex-col gap-2">
            <input
              type="email"
              placeholder="Email for reset"
              value={resetEmail}
              onChange={e => setResetEmail(e.target.value)}
              className="border p-2 rounded"
            />
            <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition" disabled={resetLoading}>
              Send Reset Email
            </button>
            {resetMsg && <div className="text-xs text-blue-700 mt-1">{resetMsg}</div>}
          </form>
        )}
        <div className="mb-4">
          <div className="text-gray-700 font-medium">Email:</div>
          <div className="text-gray-900">{profile.email || user.email}</div>
        </div>
        {edit ? (
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div>
              <label className="text-gray-700">Username</label>
              <input name="username" value={form.username} onChange={handleInput} className="border p-2 rounded w-full" />
            </div>
            <div>
              <label className="text-gray-700">12-digit Number</label>
              <input name="number" value={form.number} onChange={handleInput} className="border p-2 rounded w-full" maxLength={12} />
            </div>
            {formError && <div className="text-red-500 text-sm">{formError}</div>}
            <div className="flex gap-2 mt-2">
              <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition" disabled={formLoading}>Save</button>
              <button type="button" className="bg-gray-200 text-gray-700 py-2 px-4 rounded hover:bg-gray-300 transition" onClick={() => setEdit(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <div className="mb-2">
              <div className="text-gray-700 font-medium">Username:</div>
              <div className="text-gray-900">{profile.username}</div>
            </div>
            <div className="mb-2">
              <div className="text-gray-700 font-medium">12-digit Number:</div>
              <div className="text-gray-900">{profile.number}</div>
            </div>
            <button className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition mt-2" onClick={() => setEdit(true)}>Edit</button>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile; 