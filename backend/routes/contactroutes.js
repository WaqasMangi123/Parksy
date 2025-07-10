const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Contact form submission route
router.post('/submit', async (req, res) => {
  try {
    const { name, email, phone, inquiryType, message } = req.body;

    // Validate required fields
    if (!name || !email || !inquiryType || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address',
      });
    }

    // Email to admin
    const adminMailOptions = {
      from: `"Parksy Support" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Admin email address
      subject: `🚗 Parksy Contact Form - ${inquiryType} from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">🚗 Parksy</h1>
            <h2 style="color: #374151; margin: 10px 0;">New Contact Form Submission</h2>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #1f2937; margin-top: 0;">Contact Details</h3>
            <p><strong>👤 Name:</strong> ${name}</p>
            <p><strong>📧 Email:</strong> ${email}</p>
            <p><strong>📱 Phone:</strong> ${phone || 'Not provided'}</p>
          </div>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #92400e; margin-top: 0;">Inquiry Details</h3>
            <p><strong>🏷️ Issue Type:</strong> ${inquiryType}</p>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px;">
            <h3 style="color: #0c4a6e; margin-top: 0;">💬 Message</h3>
            <p style="background-color: white; padding: 15px; border-radius: 5px; border-left: 4px solid #2563eb;">${message}</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #6b7280; font-size: 14px;">
              This message was sent via Parksy Contact Widget<br/>
              <span style="color: #9ca3af;">Received on ${new Date().toLocaleString()}</span>
            </p>
          </div>
        </div>
      `,
    };

    // Email to user (confirmation)
    const userMailOptions = {
      from: `"Parksy Support Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🚗 Thank you for contacting Parksy - We\'ve received your message!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">🚗 Parksy</h1>
            <h2 style="color: #16a34a;">Thank you for reaching out!</h2>
          </div>
          
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #16a34a; margin-bottom: 20px;">
            <h3 style="color: #15803d; margin-top: 0;">Hi ${name}! 👋</h3>
            <p style="color: #166534;">We've successfully received your message about <strong>"${inquiryType}"</strong> and our support team will get back to you within 24 hours.</p>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #374151; margin-top: 0;">📋 Your Submission Summary</h3>
            <p><strong>Issue Type:</strong> ${inquiryType}</p>
            <p><strong>Your Message:</strong></p>
            <div style="background-color: white; padding: 15px; border-radius: 5px; border-left: 4px solid #2563eb;">
              ${message}
            </div>
          </div>
          
          <div style="background-color: #fef9e7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #a16207; margin-top: 0;">🎯 What happens next?</h3>
            <ul style="color: #92400e; margin: 0; padding-left: 20px;">
              <li>Our support team will review your inquiry</li>
              <li>You'll receive a detailed response within 24 hours</li>
              <li>For urgent parking issues, we'll prioritize your request</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #2563eb; font-weight: bold;">Need immediate assistance?</p>
            <p style="color: #6b7280; font-size: 14px;">
              Visit our FAQ section or contact us directly at support@parksy.com
            </p>
            <br/>
            <p style="color: #6b7280; font-size: 12px;">
              Best regards,<br/>
              <strong>The Parksy Support Team</strong> 🚗
            </p>
          </div>
        </div>
      `,
    };

    // Send both emails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(userMailOptions);

    res.status(200).json({
      success: true,
      message: 'Thank you for contacting us! We\'ve sent a confirmation to your email and will respond within 24 hours.',
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;