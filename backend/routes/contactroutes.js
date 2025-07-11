const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactcontroller');
const EmergencyContact = require('../models/emergencycontact');

// Emergency contact form submission route
router.post('/submit', contactController.submitContactForm);

// Get inquiry types for dropdown (for frontend)
router.get('/inquiry-types', contactController.getInquiryTypes);

// ==================== ADMIN ROUTES ====================

// Get all emergency contacts with filtering and pagination
router.get('/admin/all', contactController.getAllEmergencyContacts);

// Get dashboard statistics
router.get('/admin/stats', contactController.getDashboardStats);

// Get single emergency contact by ID
router.get('/admin/:id', async (req, res) => {
  try {
    const contact = await EmergencyContact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found'
      });
    }
    res.status(200).json({
      success: true,
      data: contact
    });
  } catch (error) {
    console.error('Error fetching emergency contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching emergency contact'
    });
  }
});

// Update emergency contact status
router.put('/admin/:id/status', contactController.updateEmergencyContactStatus);

// Add admin response to emergency contact
router.put('/admin/:id/response', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminResponse, assignedTo } = req.body;
    
    if (!adminResponse) {
      return res.status(400).json({
        success: false,
        message: 'Admin response is required'
      });
    }
    
    const contact = await EmergencyContact.findByIdAndUpdate(
      id,
      {
        adminResponse,
        responseDate: new Date(),
        status: 'IN_PROGRESS',
        assignedTo: assignedTo || undefined
      },
      { new: true }
    );
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Admin response added successfully',
      data: contact
    });
  } catch (error) {
    console.error('Error adding admin response:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding admin response'
    });
  }
});

// Assign emergency contact to admin
router.put('/admin/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;
    
    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Assigned admin is required'
      });
    }
    
    const contact = await EmergencyContact.findByIdAndUpdate(
      id,
      { assignedTo },
      { new: true }
    );
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Emergency contact assigned successfully',
      data: contact
    });
  } catch (error) {
    console.error('Error assigning emergency contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning emergency contact'
    });
  }
});

// Add tags to emergency contact
router.put('/admin/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;
    
    if (!Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        message: 'Tags must be an array'
      });
    }
    
    const contact = await EmergencyContact.findByIdAndUpdate(
      id,
      { tags },
      { new: true }
    );
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Tags updated successfully',
      data: contact
    });
  } catch (error) {
    console.error('Error updating tags:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating tags'
    });
  }
});

// Delete emergency contact (soft delete - change status to CLOSED)
router.delete('/admin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const contact = await EmergencyContact.findByIdAndUpdate(
      id,
      { status: 'CLOSED' },
      { new: true }
    );
    
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Emergency contact not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Emergency contact closed successfully',
      data: contact
    });
  } catch (error) {
    console.error('Error closing emergency contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error closing emergency contact'
    });
  }
});

// Get overdue emergency contacts
router.get('/admin/overdue/list', async (req, res) => {
  try {
    const contacts = await EmergencyContact.find({
      status: { $in: ['OPEN', 'IN_PROGRESS'] }
    }).sort({ createdAt: -1 });
    
    const overdueContacts = contacts.filter(contact => contact.isOverdue());
    
    res.status(200).json({
      success: true,
      data: overdueContacts,
      count: overdueContacts.length
    });
  } catch (error) {
    console.error('Error fetching overdue contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching overdue contacts'
    });
  }
});

// Get emergency contacts by status
router.get('/admin/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses: ' + validStatuses.join(', ')
      });
    }
    
    const contacts = await EmergencyContact.find({ status: status.toUpperCase() })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await EmergencyContact.countDocuments({ status: status.toUpperCase() });
    
    res.status(200).json({
      success: true,
      data: contacts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching contacts by status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts by status'
    });
  }
});

// Get emergency contacts by priority
router.get('/admin/priority/:priority', async (req, res) => {
  try {
    const { priority } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    if (!['HIGH', 'NORMAL'].includes(priority.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid priority. Valid priorities: HIGH, NORMAL'
      });
    }
    
    const contacts = await EmergencyContact.find({ priority: priority.toUpperCase() })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    
    const total = await EmergencyContact.countDocuments({ priority: priority.toUpperCase() });
    
    res.status(200).json({
      success: true,
      data: contacts,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching contacts by priority:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts by priority'
    });
  }
});

// Search emergency contacts
router.get('/admin/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const searchRegex = new RegExp(q, 'i');
    
    const contacts = await EmergencyContact.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { ticketId: searchRegex },
        { inquiryType: searchRegex },
        { message: searchRegex }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .exec();
    
    const total = await EmergencyContact.countDocuments({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { ticketId: searchRegex },
        { inquiryType: searchRegex },
        { message: searchRegex }
      ]
    });
    
    res.status(200).json({
      success: true,
      data: contacts,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total,
      searchQuery: q
    });
  } catch (error) {
    console.error('Error searching contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching contacts'
    });
  }
});

// Get emergency contacts within date range
router.get('/admin/date-range', async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
    
    const contacts = await EmergencyContact.find({
      createdAt: {
        $gte: start,
        $lte: end
      }
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .exec();
    
    const total = await EmergencyContact.countDocuments({
      createdAt: {
        $gte: start,
        $lte: end
      }
    });
    
    res.status(200).json({
      success: true,
      data: contacts,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total,
      dateRange: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error fetching contacts by date range:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts by date range'
    });
  }
});

// Export emergency contacts to CSV (for admin reporting)
router.get('/admin/export/csv', async (req, res) => {
  try {
    const { status, priority, startDate, endDate } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (priority) filter.priority = priority.toUpperCase();
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const contacts = await EmergencyContact.find(filter)
      .sort({ createdAt: -1 })
      .exec();
    
    // Create CSV headers
    const csvHeaders = [
      'Ticket ID',
      'Name',
      'Email',
      'Phone',
      'Inquiry Type',
      'Priority',
      'Status',
      'Message',
      'Created At',
      'Response Date',
      'Assigned To',
      'Admin Response'
    ];
    
    // Convert data to CSV format
    const csvData = contacts.map(contact => [
      contact.ticketId,
      contact.name,
      contact.email,
      contact.phone,
      contact.inquiryType,
      contact.priority,
      contact.status,
      contact.message.replace(/,/g, ';'), // Replace commas in message
      contact.createdAt.toISOString(),
      contact.responseDate ? contact.responseDate.toISOString() : '',
      contact.assignedTo || '',
      contact.adminResponse ? contact.adminResponse.replace(/,/g, ';') : ''
    ]);
    
    // Combine headers and data
    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="emergency_contacts_${new Date().toISOString().split('T')[0]}.csv"`);
    
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Error exporting contacts to CSV:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting contacts to CSV'
    });
  }
});

// Get response time analytics
router.get('/admin/analytics/response-time', async (req, res) => {
  try {
    const analytics = await EmergencyContact.aggregate([
      {
        $match: {
          responseDate: { $exists: true }
        }
      },
      {
        $addFields: {
          responseTimeHours: {
            $divide: [
              { $subtract: ['$responseDate', '$createdAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: '$priority',
          avgResponseTime: { $avg: '$responseTimeHours' },
          minResponseTime: { $min: '$responseTimeHours' },
          maxResponseTime: { $max: '$responseTimeHours' },
          totalTickets: { $sum: 1 }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Error fetching response time analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching response time analytics'
    });
  }
});

// Get inquiry type distribution
router.get('/admin/analytics/inquiry-types', async (req, res) => {
  try {
    const distribution = await EmergencyContact.aggregate([
      {
        $group: {
          _id: '$inquiryType',
          count: { $sum: 1 },
          highPriorityCount: {
            $sum: { $cond: [{ $eq: ['$priority', 'HIGH'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: distribution
    });
  } catch (error) {
    console.error('Error fetching inquiry type distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching inquiry type distribution'
    });
  }
});

module.exports = router;