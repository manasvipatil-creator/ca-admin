// Script to cleanup old RTDB data for a specific client
// Usage: node scripts/cleanupRTDB.js <email> <clientContact>
// Example: node scripts/cleanupRTDB.js shreyshshah@gmail.com 7385711985

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, remove, get } from 'firebase/database';

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
const rtdb = getDatabase(app);

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('❌ Usage: node scripts/cleanupRTDB.js <email> <clientContact>');
  console.error('❌ Example: node scripts/cleanupRTDB.js shreyshshah@gmail.com 7385711985');
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

async function cleanupRTDBData() {
  try {
    // Path: ca_admin/{safeEmail}/user/clients/{clientContact}
    const clientPath = `ca_admin/${safeEmail}/user/clients/${clientContact}`;
    const clientRef = ref(rtdb, clientPath);
    
    console.log('📍 RTDB path:', clientPath);
    console.log('');
    
    // Check if data exists
    console.log('🔍 Checking if data exists in RTDB...');
    const snapshot = await get(clientRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('📊 Found data in RTDB:');
      
      // Count years
      if (data.years) {
        const yearKeys = Object.keys(data.years);
        console.log(`   📅 Years: ${yearKeys.length}`);
        
        // Count generic documents
        yearKeys.forEach(yearKey => {
          const year = data.years[yearKey];
          if (year.genericDocuments) {
            const docCount = Object.keys(year.genericDocuments).length;
            console.log(`      Year ${yearKey}: ${docCount} generic documents`);
          }
        });
      }
      
      console.log('');
      console.log('🗑️ Deleting data from RTDB...');
      
      // Delete the entire client node
      await remove(clientRef);
      
      console.log('✅ Successfully deleted client data from RTDB');
      console.log('');
      
    } else {
      console.log('ℹ️ No data found in RTDB for this client');
      console.log('');
    }
    
    console.log('🎉 Cleanup completed!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error cleaning up RTDB data:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupRTDBData()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
