/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable jsx-a11y/alt-text */
import FolderIcon from "@mui/icons-material/Folder";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import DocumentRow from "../components/DocumentRow";
import db, { auth, storage } from "../firebase";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
};

const Feed = () => {
  const [user] = useAuthState(auth);
  const [open, setOpen] = React.useState(false);
  const [input, setInput] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const [messages, setMessages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [storageUsed, setStorageUsed] = useState(0);

  // Helper to get total storage used by user
  const getUserStorageUsage = async () => {
    const listResult = await storage.ref(`userDocs/${user?.email}/uploads`).listAll();
    let total = 0;
    for (const item of listResult.items) {
      const metadata = await item.getMetadata();
      total += metadata.size;
    }
    return total;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert("File size exceeds 50 MB limit.");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    // Check total storage usage
    const used = await getUserStorageUsage();
    if (used + file.size > 500 * 1024 * 1024 * 1024) {
      alert("Total storage limit (500 GB) exceeded.");
      setUploading(false);
      return;
    }
    const storageRef = storage.ref(`userDocs/${user?.email}/uploads/${file.name}`);
    const uploadTask = storageRef.put(file);
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      },
      (error) => {
        alert("Upload failed: " + error.message);
        setUploading(false);
      },
      async () => {
        const url = await uploadTask.snapshot.ref.getDownloadURL();
        await db.collection("userDocs").doc(user?.email).collection("docs").add({
          fileName: file.name,
          fileUrl: url,
          fileSize: file.size,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        });
        setUploading(false);
        setUploadProgress(0);
      }
    );
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(
    () =>
      db
        .collection("userDocs")
        .doc(user?.email)
        .collection("docs")
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => setMessages(snapshot.docs)),
    [db]
  );

  useEffect(() => {
    if (user) {
      getUserStorageUsage().then(setStorageUsed);
    }
  }, [user, messages.length]);

  const createDocument = async () => {
    if (!input) return;
    setCreateLoading(true);

    try {
      db.collection("userDocs").doc(user?.email).collection("docs").add({
        fileName: input,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.log(error);
    }

    setCreateLoading(false);
    setInput("");
    handleClose();
  };

  const model = (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={style} className="rounded-lg">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          type="text"
          className="outline-none w-full"
          placeholder="Enter name of Document"
          onKeyDown={(e) => e.key === "Enter" && createDocument()}
        />
        {createLoading ? (
          <div className="flex justify-center">
            <button
              type="button"
              data-mdb-ripple="true"
              data-mdb-ripple-color="light"
              className="inline-block w-44 mt-10 px-6 py-2.5 animate-bounce bg-blue-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-200 active:shadow-lg transition duration-150 ease-in-out"
            >
              Loading...
            </button>
          </div>
        ) : (
          <div className="flex justify-between gap-4">
            <button
              onClick={handleClose}
              type="button"
              data-mdb-ripple="true"
              data-mdb-ripple-color="light"
              className="inline-block w-44 mt-10 px-6 py-2.5 bg-transparent text-black font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-transparent hover:shadow-lg focus:bg-red-300 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-red-500 active:shadow-lg transition duration-150 ease-in-out"
            >
              Cancel
            </button>
            <button
              onClick={createDocument}
              type="button"
              data-mdb-ripple="true"
              data-mdb-ripple-color="light"
              className="inline-block w-44 mt-10 px-6 py-2.5 bg-blue-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-200 active:shadow-lg transition duration-150 ease-in-out"
            >
              Create
            </button>
          </div>
        )}
      </Box>
    </Modal>
  );

  return (
    <>
      {model}
      <section className="bg-[#F8F9FA] pb-10 px-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between py-6">
            <h2 className="text-gray-700 text-lg">Start a new Document</h2>
            <IconButton className="border-1">
              <MoreVertIcon className="text-gray-200 text-3xl" />
            </IconButton>
          </div>
          <div className="flex gap-6 items-center">
            <div
              onClick={handleOpen}
              className="relative h-52 w-40 border-2 cursor-pointer hover:border-blue-600"
            >
              <Image
                src="https://cardinal-images.s3.us-west-1.amazonaws.com/document-shield-svgrepo-com.svg"
                layout="fill"
              />
            </div>
            <div className="flex flex-col items-center">
              <label className="block mb-2 text-sm font-medium text-gray-700" htmlFor="file-upload">Upload Document</label>
              <input
                id="file-upload"
                type="file"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading && (
                <div className="w-full mt-2">
                  <div className="bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Uploading... {uploadProgress.toFixed(0)}%</p>
                </div>
              )}
            </div>
          </div>
          <p className="ml-2 mt-2 font-semibold text-sm text-gray-700">Blank</p>
        </div>
      </section>
      <section className="bg-white px-10 md:px-0">
        <div className="max-w-3xl mx-auto py-8 text-sm text-gray-700">
          {/* Storage Usage Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-gray-700">Storage Used</span>
              <span className="text-xs text-gray-500">{(storageUsed / (1024*1024*1024)).toFixed(2)} GB / 500 GB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(storageUsed / (500*1024*1024*1024))*100}%` }}></div>
            </div>
          </div>
          <div className="flex items-center justify-between pb-5">
            <h2 className="font-medium flex-grow">My Documents</h2>
            <p className="mr-12">Date Created</p>
            <InsertDriveFileIcon className="text-3xl text-gray-500" />
          </div>
          <div className="grid gap-4">
            {messages.map((doc) => {
              const data = doc.data();
              return (
                <div key={doc.id} className="flex items-center bg-gray-50 rounded-lg shadow hover:shadow-md transition p-4 group border border-gray-100">
                  <InsertDriveFileIcon className="text-blue-500 text-3xl mr-4" />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 group-hover:text-blue-700 transition">{data.fileName}</div>
                    {data.fileSize && (
                      <div className="text-xs text-gray-500">{(data.fileSize / (1024*1024)).toFixed(2)} MB</div>
                    )}
                  </div>
                  <div className="w-40 text-gray-500 text-xs">
                    {data.timestamp && typeof data.timestamp.toDate === "function"
                      ? data.timestamp.toDate().toLocaleString()
                      : "-"}
                  </div>
                  {data.fileUrl && (
                    <a href={data.fileUrl} target="_blank" rel="noopener noreferrer" className="ml-4 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-medium transition">Download</a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
};

export default Feed;
