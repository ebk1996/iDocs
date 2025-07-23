/* eslint-disable jsx-a11y/alt-text */
/* eslint-disable @next/next/no-img-element */
import React from "react";
import MenuIcon from "@mui/icons-material/Menu";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";
import AppsIcon from "@mui/icons-material/Apps";
import Image from "next/image";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut } from "firebase/auth";
import { useState, useRef } from "react";
import Link from "next/link";
import db from "../firebase";

const Header = () => {
  const [user] = useAuthState(auth);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const appsMenuRef = useRef(null);

  const logout = async () => {
    await signOut(auth);
  };

  // Close menu on outside click
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Search handler: fetch and filter user's docs by fileName
  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchOpen(false);
    if (!user || !searchTerm.trim()) return;
    // Fetch all docs for the user
    const snapshot = await db
      .collection("userDocs")
      .doc(user.email)
      .collection("docs")
      .get();
    // Filter by fileName (case-insensitive, partial match)
    const results = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(doc =>
        doc.fileName &&
        doc.fileName.toLowerCase().includes(searchTerm.trim().toLowerCase())
      );
    setSearchResults(results);
    setSearchOpen(true);
  };

  // Close apps menu on outside click
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (appsMenuRef.current && !appsMenuRef.current.contains(event.target)) {
        setAppsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 flex items-center px-4 py-2 shadow-md bg-blue-50 justify-between">
      <div className="flex items-center gap-2">
        <IconButton className="hidden md:inline-flex h-20 w-20 border-0" href="/">
          <MenuIcon className="text-black-50 text-3sm" />
        </IconButton>
        <Image
          height="66"
          width="66"
          src="https://cardinal-images.s3.us-west-1.amazonaws.com/idocs_1.png"
          objectFit="contain"
        />
      </div>
      <div className="mx-5 md:mx-20 flex flex-grow items-center px-5 py-2 bg-gray-100 text-gray-600 rounded-lg focus-within:text-gray-600 focus-within:shadow-sm max-w-xl relative">
        <SearchIcon className="text-3xl text-gray-500" />
        <form onSubmit={handleSearch} className="flex-grow flex">
          <input
            placeholder="Search iDocs&trade; Documents..."
            type="text"
            className="flex-grow px-5 text-base bg-transparent outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onFocus={() => searchResults.length && setSearchOpen(true)}
          />
        </form>
        {/* Search Results Dropdown */}
        {searchOpen && searchResults.length > 0 && (
          <div className="absolute left-0 top-full mt-2 w-full bg-white border border-gray-200 rounded shadow z-50 max-h-60 overflow-y-auto">
            {searchResults.map(doc => (
              <a
                key={doc.id}
                href={doc.fileUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2 hover:bg-blue-50 text-gray-800 text-sm border-b last:border-b-0 border-gray-100"
                onClick={() => setSearchOpen(false)}
              >
                <span className="font-medium">{doc.fileName}</span>
                {doc.fileSize && (
                  <span className="ml-2 text-xs text-gray-500">{(doc.fileSize / (1024*1024)).toFixed(2)} MB</span>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 relative">
        <div className="relative">
          <IconButton className="hidden md:inline-flex h-20 w-20 border-0" onClick={() => setAppsOpen((v) => !v)}>
            <AppsIcon className="text-gray-500 text-3xl" />
          </IconButton>
          {appsOpen && (
            <div ref={appsMenuRef} className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-50">
              <div className="flex flex-col p-2">
                <Link href="/">
                  <a className="flex items-center gap-2 px-4 py-2 rounded hover:bg-blue-50 text-gray-800 text-sm font-medium" onClick={() => setAppsOpen(false)}>
                    <span role="img" aria-label="docs">📄</span> iDocs&trade; Home
                  </a>
                </Link>
                <Link href="/profile">
                  <a className="flex items-center gap-2 px-4 py-2 rounded hover:bg-blue-50 text-gray-800 text-sm font-medium" onClick={() => setAppsOpen(false)}>
                    <span role="img" aria-label="profile">👤</span> Profile
                  </a>
                </Link>
                {/* Add more apps/links here as needed */}
              </div>
            </div>
          )}
        </div>
        <div className="relative">
          <img
            loading="lazy"
            src={user?.photoURL}
            alt="Profile"
            className="cursor-pointer h-12 w-12 rounded-full border-2 border-blue-500 hover:shadow-lg transition"
            onClick={() => setMenuOpen((open) => !open)}
          />
          {menuOpen && (
            <div ref={menuRef} className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 z-50">
              <div className="flex flex-col items-center p-4">
                <img src={user?.photoURL} alt="Profile" className="h-16 w-16 rounded-full mb-2" />
                <span className="font-semibold text-gray-800">{user?.displayName}</span>
                <span className="text-xs text-gray-500 mb-2">{user?.email}</span>
                <Link href="/profile">
                  <button className="mt-2 px-4 py-2 bg-gray-100 text-blue-700 rounded hover:bg-blue-100 w-full text-sm font-medium mb-2">Profile</button>
                </Link>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full text-sm font-medium"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
