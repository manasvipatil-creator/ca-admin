// Script to manually delete a client from Firestore
// Usage: node scripts/deleteClient.js <email> <clientContact>
// Example: node scripts/deleteClient.js shreyshshah@gmail.com 7385711985

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, listAll, deleteObject } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBsdHLVNOXTv5ZrlOgu-oXC4csCpBImSrA",
  authDomain: "shreyshshah.firebaseapp.com",
  databaseURL: "https://shreyshshah-default-rtdb.firebaseio.com",
  projectId: "shreyshshah",
  storageBucket: "shreyshshah.firebasestorage.app",
  messagingSenderId: "918834060355",
  appId: "1:918834060355:web:65e9c613c9e8054fa708f6",
  measurementId: "G-QX2HZ6VNXB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('❌ Usage: node scripts/deleteClient.js <email> <clientContact>');
  console.error('❌ Example: node scripts/deleteClient.js shreyshshah@gmail.com 7385711985');
  process.exit(1);
}

const email = args[0];
const clientContact = args[1];

// Sanitize email (replace dots with underscores)
const safeEmail = email.replace(/\./g, '_');

console.log('🔧 Configuration:');
console.log('📧 Email:', email);
console.log('📧 Safe Email:', safeEmail);
console.log('📞 Client Contact:', clientContact);
console.log('');

async function deleteClientCompletely() {
  try {
    const clientDocRef = doc(db, 'ca_admin', safeEmail, 'clients', clientContact);
    
    console.log('📍 Client path:', clientDocRef.path);
    console.log('');
    
    // Step 1: Delete all years and their documents
    console.log('📅 Step 1: Deleting years subcollection...');
    try {
      const yearsCollectionRef = collection(clientDocRef, 'years');
      const yearsSnapshot = await getDocs(yearsCollectionRef);
      
      console.log(`   Found ${yearsSnapshot.size} years`);
      
      for (const yearDoc of yearsSnapshot.docs) {
        console.log(`   📅 Processing year: ${yearDoc.id}`);
        
        // Delete all documents in this year
        try {
          const documentsCollectionRef = collection(yearDoc.ref, 'documents');
          const documentsSnapshot = await getDocs(documentsCollectionRef);
          
          console.log(`      Found ${documentsSnapshot.size} documents`);
          
          for (const docToDelete of documentsSnapshot.docs) {
            await deleteDoc(docToDelete.ref);
            console.log(`      ✅ Deleted document: ${docToDelete.id}`);
          }
        } catch (docError) {
          console.warn(`      ⚠️ Error deleting documents:`, docError.message);
        }
        
        // Delete the year document
        await deleteDoc(yearDoc.ref);
        console.log(`   ✅ Deleted year: ${yearDoc.id}`);
      }
      
      console.log('✅ Years subcollection deleted');
    } catch (yearsError) {
      console.warn('⚠️ Error deleting years:', yearsError.message);
    }
    console.log('');
    
    // Step 2: Delete all generic documents
    console.log('📄 Step 2: Deleting genericDocuments subcollection...');
    try {
      const genericDocsCollectionRef = collection(clientDocRef, 'genericDocuments');
      const genericDocsSnapshot = await getDocs(genericDocsCollectionRef);
      
      console.log(`   Found ${genericDocsSnapshot.size} generic documents`);
      
      for (const docToDelete of genericDocsSnapshot.docs) {
        await deleteDoc(docToDelete.ref);
        console.log(`   ✅ Deleted generic document: ${docToDelete.id}`);
      }
      
      console.log('✅ Generic documents deleted');
    } catch (genericError) {
      console.warn('⚠️ Error deleting generic documents:', genericError.message);
    }
    console.log('');
    
    // Step 3: Delete storage files
    console.log('🗄️ Step 3: Deleting storage files...');
    const storagePaths = [
      `${safeEmail}/clients/${clientContact}`,
      `documents/${clientContact}`,
    ];
    
    for (const path of storagePaths) {
      try {
        console.log(`   🔍 Checking path: ${path}`);
        const folderRef = ref(storage, path);
        const fileList = await listAll(folderRef);
        
        console.log(`      Found ${fileList.items.length} files and ${fileList.prefixes.length} folders`);
        
        // Delete all files
        for (const itemRef of fileList.items) {
          await deleteObject(itemRef);
          console.log(`      ✅ Deleted file: ${itemRef.name}`);
        }
        
        // Delete files in subfolders
        for (const folderRef of fileList.prefixes) {
          const subFileList = await listAll(folderRef);
          for (const itemRef of subFileList.items) {
            await deleteObject(itemRef);
            console.log(`      ✅ Deleted file: ${itemRef.fullPath}`);
          }
        }
        
        console.log(`   ✅ Cleaned up path: ${path}`);
      } catch (storageError) {
        console.log(`   ℹ️ Path not found or empty: ${path}`);
      }
    }
    console.log('');
    
    // Step 4: Delete the client document
    console.log('📋 Step 4: Deleting client document...');
    await deleteDoc(clientDocRef);
    console.log('✅ Client document deleted');
    console.log('');
    
    console.log('🎉 Client deleted successfully!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error deleting client:', error);
    process.exit(1);
  }
}

// Run the deletion
deleteClientCompletely()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
