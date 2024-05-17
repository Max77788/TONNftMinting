const { readdir } = require('fs/promises');

async function listFiles() {
  try {
    const files = await readdir('./data/images/');
    return files; // Return the files after the promise is fulfilled
  } catch (error) {
    console.error('Error reading directory:', error);
    throw error; // Rethrow the error to allow the caller to handle it
  }
}

// Example usage in an async function to output files one-by-one
(async () => {
  try {
    const files = await listFiles();
    files.forEach(file => {
      console.log('File:', file); // Log each file one-by-one
    });
  } catch (error) {
    console.error('Error:', error);
  }
})();

