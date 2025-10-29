const { S3Client } = require('@aws-sdk/client-s3');

console.log("AWS_ACCESS_KEY", process.env.AWS_ACCESS_KEY);
console.log("AWS_SECRET_KEY", process.env.AWS_SECRET_KEY);
console.log("AWS_REGION", process.env.AWS_REGION);
console.log("AWS_S3_BUCKET", process.env.AWS_S3_BUCKET);

// Validate required environment variables
if (!process.env.AWS_REGION) {
    throw new Error('AWS_REGION environment variable is not set. Please configure it in your .env file.');
}

if (!process.env.AWS_ACCESS_KEY) {
    throw new Error('AWS_ACCESS_KEY environment variable is not set. Please configure it in your .env file.');
}

if (!process.env.AWS_SECRET_KEY) {
    throw new Error('AWS_SECRET_KEY environment variable is not set. Please configure it in your .env file.');
}

if (!process.env.AWS_S3_BUCKET) {
    throw new Error('AWS_S3_BUCKET environment variable is not set. Please configure it in your .env file.');
}

exports.s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    },
})