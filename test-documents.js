console.log('Testing client document fetching...');
const { getClientDocuments } = require('./src/services/documentService');
const clientId = '3d1f7b19-5d80-4acf-aac4-98d696a8'; // The client ID from the issue

async function testDocuments() {
  try {
    console.log();
    const docs = await getClientDocuments(clientId);
    console.log();
    if (docs?.length > 0) {
      console.log('First document:', docs[0]);
    } else {
      console.log('No documents found');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testDocuments();
