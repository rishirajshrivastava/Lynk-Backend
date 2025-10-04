const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client } = require('./s3-credentials');

exports.putObject = async (file, filename) => {
    try {
        const params = {
            Bucket: process.env.AWS_S3_BUCKET,
            Key: `${filename}`,
            Body: file,
            ContentType: "image/jpeg,image/png,image/jpg",
        }

        const command = new PutObjectCommand(params);
        const data = await s3Client.send(command);
        if(data.$metadata.httpStatusCode !== 200) {
            throw new Error("Failed to upload file to s3");
        }

        let photoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
        console.log("photoUrl", photoUrl);
        return {photoUrl , key: params.Key};
    } catch (error) {
        console.log("error uploading file to s3", error);
        throw error;
    }
}