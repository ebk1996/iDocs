/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/alt-text */
import Head from "next/head";
import Image from "next/image";
import { useSignInWithGoogle } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
import db from "../firebase";
import { useEffect, useState } from "react";

const Login = () => {
  const [signInWithGoogle, userCred, loading, error] = useSignInWithGoogle(auth);
  const [isSignup, setIsSignup] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", username: "", number: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const validateForm = () => {
    if (!form.email.match(/^\S+@\S+\.\S+$/)) return "Invalid email.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    if (!form.username.trim()) return "Username is required.";
    if (!/^\d{12}$/.test(form.number)) return "12-digit number required.";
    return null;
  };

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError("");
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setFormError("");
    const err = validateForm();
    if (err) return setFormError(err);
    setFormLoading(true);
    try {
      if (isSignup) {
        // Check if username or number already exists
        const usernameSnap = await db.collection("users").where("username", "==", form.username).get();
        if (!usernameSnap.empty) throw new Error("Username already taken.");
        const numberSnap = await db.collection("users").where("number", "==", form.number).get();
        if (!numberSnap.empty) throw new Error("12-digit number already in use.");
        // Create user
        const userCred = await auth.createUserWithEmailAndPassword(form.email, form.password);
        await db.collection("users").doc(userCred.user.email).set({
          email: form.email,
          username: form.username,
          number: form.number,
          createdAt: new Date(),
        });
      } else {
        await auth.signInWithEmailAndPassword(form.email, form.password);
      }
    } catch (err) {
      setFormError(err.message);
    }
    setFormLoading(false);
  };

  useEffect(() => {
    if (userCred && userCred.user) {
      const userRef = db.collection("users").doc(userCred.user.email);
      userRef.get().then((doc) => {
        if (!doc.exists) {
          userRef.set({
            email: userCred.user.email,
            name: userCred.user.displayName,
            photoURL: userCred.user.photoURL,
            createdAt: new Date(),
          });
        }
      });
    }
  }, [userCred]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <Head>
        <title>iDocs&trade; Login</title>
        <meta name="description" content="Enterprise Cloud Document Storage" />
        <link rel="icon" href="https://cardinal-images.s3.us-west-1.amazonaws.com/idocs_1.png" />
      </Head>
      <Image src="https://cardinal-images.s3.us-west-1.amazonaws.com/idocs_1.png" objectFit="contain" height="300" width="550" />
      <form onSubmit={handleAuth} className="flex flex-col gap-3 w-80 mt-6 bg-white p-6 rounded shadow">
        {isSignup && (
          <>
            <input name="username" value={form.username} onChange={handleInput} placeholder="Username" className="border p-2 rounded" />
            <input name="number" value={form.number} onChange={handleInput} placeholder="12-digit number" className="border p-2 rounded" maxLength={12} />
          </>
        )}
        <input name="email" value={form.email} onChange={handleInput} placeholder="Email" className="border p-2 rounded" />
        <input name="password" value={form.password} onChange={handleInput} placeholder="Password" type="password" className="border p-2 rounded" />
        {formError && <div className="text-red-500 text-sm">{formError}</div>}
        <button type="submit" className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition" disabled={formLoading}>{isSignup ? "Sign Up" : "Login"}</button>
        <button type="button" className="text-blue-600 underline text-xs mt-2" onClick={() => setIsSignup((v) => !v)}>
          {isSignup ? "Already have an account? Login" : "Don't have an account? Sign Up"}
        </button>
      </form>
      <div className="mt-6">or</div>
      <button
        onClick={() => signInWithGoogle()}
        type="button"
        data-mdb-ripple="true"
        data-mdb-ripple-color="light"
        className="inline-block w-44 mt-4 px-6 py-2.5 bg-blue-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out"
      >
        Login
      </button>
    </div>
  );
};

export default Login;
