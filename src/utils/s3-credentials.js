const { S3Client } = require('@aws-sdk/client-s3');

console.log("AWS_ACCESS_KEY", process.env.AWS_ACCESS_KEY);
console.log("AWS_SECRET_KEY", process.env.AWS_SECRET_KEY);
console.log("AWS_REGION", process.env.AWS_REGION);
console.log("AWS_S3_BUCKET", process.env.AWS_S3_BUCKET);

exports.s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY,
    },
})