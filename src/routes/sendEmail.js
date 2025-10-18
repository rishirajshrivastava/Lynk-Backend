const express = require('express');
const emailRouter = express.Router();
const userAuth = require('../middlewares/auth');
const { sendEmail } = require('../utils/emailService');
const { blockedDomains } = require('../utils/blockedDomains');
const User = require('../models/user');

// Send custom email
emailRouter.post('/send-email', userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const userDetails = await User.findById(loggedInUser._id).select('otp emailVerified');
        const {otp: {expiresAt}, emailVerified} = userDetails;
        console.log(expiresAt, emailVerified);

        if(emailVerified) {
            return res.status(400).json({
                message: 'Email already verified'
            });
        }
 
        if(expiresAt && expiresAt > Date.now()) {
            return res.status(400).json({
                message: 'Use existing OTP or retry after 2 minutes',
                expiryTime: expiresAt
            });
        }

        const { to } = req.body;
        const subject = "Email Verification OTP";
        const OTP = Math.floor(100000 + Math.random() * 900000);
        const text = `Your verification OTP is: ${OTP}`;
        
        if(to.includes('@')) {
            const domain = to.split('@')[1];
            if(blockedDomains.includes(domain)) {
                res.status(400).json({
                    message: 'Email domain is blocked'
                });
                return;
            }
        }
        
        if (!to || !subject || !text) {
            return res.status(400).json({ 
                message: 'to, subject, and text are required' 
            });
        }

        const result = await sendEmail(to, subject, text);
        await User.findByIdAndUpdate(loggedInUser._id, { otp: { otp: OTP, expiresAt: new Date(Date.now() + 2 * 60 * 1000) } });
        
        res.json({
            message: 'Email sent successfully',
            messageId: result.messageId
        });
    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({ 
            message: 'Failed to send email',
            error: error.message 
        });
    }
});

emailRouter.post('/verify-otp', userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { otp } = req.body;
        
        if (!otp) {
            return res.status(400).json({
                message: 'OTP is required'
            });
        }
        
        const userDetails = await User.findById(loggedInUser._id).select('otp emailVerified');
        const {otp: {otp: storedOTP, expiresAt}, emailVerified} = userDetails;
        
        // Check if email is already verified
        if (emailVerified) {
            return res.status(400).json({
                message: 'Email already verified'
            });
        }
        
        // Check if OTP exists and hasn't expired
        if (!storedOTP || !expiresAt) {
            return res.status(400).json({
                message: 'No valid OTP found. Please request a new OTP'
            });
        }
        
        // Check if OTP has expired
        if (expiresAt < new Date()) {
            return res.status(400).json({
                message: 'OTP has expired. Please request a new OTP'
            });
        }
        
        // Check if provided OTP matches stored OTP
        if (otp !== storedOTP) {
            return res.status(400).json({
                message: 'Invalid OTP'
            });
        }
        
        // Clear OTP field and mark email as verified
        await User.findByIdAndUpdate(loggedInUser._id, {
            $unset: { otp: 1 },
            emailVerified: true
        });
        
        res.json({
            message: 'Email verified successfully',
            emailVerified: true
        });
        
    } catch (error) {
        res.status(500).json({
            message: 'Failed to verify OTP',
            error: error.message
        });
    }
});


module.exports = emailRouter;
