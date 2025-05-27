const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateCV = async (profile, templateType = 'modern') => {
  return new Promise((resolve, reject) => {
    try {
      validateProfileStructure(profile);

      const doc = new PDFDocument({ 
        margin: 0,
        size: 'A4',
        bufferPages: true,
        pdfVersion: '1.7',
        lang: 'en-US',
        tagged: true
      });
      
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      registerFonts(doc);

      switch (templateType) {
        case 'executive':
          generateExecutiveTemplate(doc, profile);
          break;
        case 'creative':
          generateCreativeTemplate(doc, profile);
          break;
        case 'ats':
          generateATSTemplate(doc, profile);
          break;
        case 'modern':
        default:
          generateModernTemplate(doc, profile);
          break;
      }

      doc.end();
    } catch (error) {
      console.error('CV generation error:', error);
      reject(new Error('Failed to generate CV'));
    }
  });
};

function registerFonts(doc) {
  const fontPath = path.join(__dirname, 'fonts');
  try {
    doc.registerFont('regular', path.join(fontPath, 'Roboto-Regular.ttf'));
    doc.registerFont('bold', path.join(fontPath, 'Roboto-Bold.ttf'));
    doc.registerFont('light', path.join(fontPath, 'Roboto-Light.ttf'));
    doc.registerFont('medium', path.join(fontPath, 'Roboto-Medium.ttf'));
  } catch (err) {
    console.warn('Using default fonts due to:', err.message);
  }
}

// Modern Professional Template (Updated)
function generateModernTemplate(doc, profile) {
  const margin = 40;
  const contentWidth = doc.page.width - margin * 2;
  
  // Colors
  const primaryColor = '#2b579a'; // Navy blue
  const secondaryColor = '#6b8e23'; // Olive green
  const textColor = '#333333';
  const lightText = '#666666';
  const lightBg = '#f5f5f5';
  const sectionBg = '#e8f0fe';

  // Full-width header with color
  doc.fillColor(primaryColor)
    .rect(0, 0, doc.page.width, 120)
    .fill();

  doc.fillColor('#ffffff')
    .font('bold')
    .fontSize(28)
    .text(profile.name?.toUpperCase() || 'FULL NAME', margin, 50, {
      width: contentWidth,
      align: 'center',
    });

  if (profile.title) {
    doc.fillColor('#ffffff')
      .font('medium')
      .fontSize(16)
      .text(profile.title.toUpperCase(), margin, 85, {
        width: contentWidth,
        align: 'center',
      });
  }

  let yPosition = 150;

  // Contact Info Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 80)
    .fill();

  const contactItems = [
    { icon: '✉', text: profile.email },
    { icon: '📱', text: profile.phone },
    { icon: '🏠', text: profile.address },
    { icon: '🔗', text: profile.linkedin || profile.website },
  ].filter(item => item.text);

  let contactY = yPosition + 20;

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('CONTACT INFORMATION', margin + 15, contactY);

  contactY += 25;

  const contactCol1 = margin + 15;
  const contactCol2 = margin + contentWidth/2;

  contactItems.forEach((item, index) => {
    const col = index % 2 === 0 ? contactCol1 : contactCol2;
    const row = Math.floor(index / 2) * 20;
    
    doc.fillColor(textColor)
      .font('regular')
      .fontSize(10)
      .text(`${item.icon} ${item.text}`, col, contactY + row, {
        width: contentWidth/2 - 30,
      });
  });

  yPosition += 100;

  // Summary Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 100)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('PROFESSIONAL SUMMARY', margin + 15, yPosition + 20);

  if (profile.objective) {
    doc.fillColor(textColor)
      .font('regular')
      .fontSize(10)
      .text(profile.objective, margin + 15, yPosition + 40, {
        width: contentWidth - 30,
        lineGap: 5,
      });
  }

  yPosition += 120;

  // Experience Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 30)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('PROFESSIONAL EXPERIENCE', margin + 15, yPosition + 10);

  yPosition += 40;

  if (profile.experiences?.length) {
    profile.experiences.forEach(exp => {
      if (yPosition > doc.page.height - 150) {
        doc.addPage();
        yPosition = margin;
      }

      doc.fillColor(primaryColor)
        .font('bold')
        .fontSize(10)
        .text(exp.position || 'Position', margin, yPosition);

      doc.fillColor(secondaryColor)
        .font('medium')
        .fontSize(9)
        .text(exp.company || 'Company', margin + 200, yPosition);

      const dateText = `${formatDate(exp.startDate)} - ${
        exp.currentlyWorking ? 'Present' : formatDate(exp.endDate)
      }`;

      doc.fillColor(lightText)
        .font('regular')
        .fontSize(8)
        .text(dateText, margin + contentWidth - 100, yPosition, {
          align: 'right',
        });

      yPosition += 15;

      if (exp.description) {
        const bullets = exp.description.split('\n').filter(Boolean);
        bullets.forEach(point => {
          doc.fillColor(textColor)
            .font('regular')
            .fontSize(9)
            .list([point.trim()], margin + 15, yPosition, {
              width: contentWidth - 30,
              bulletRadius: 2,
              lineGap: 3,
            });

          yPosition += doc.heightOfString(point, { width: contentWidth - 30 }) + 5;
        });
      }

      yPosition += 15;
    });
  }

  // Education Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 30)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('EDUCATION', margin + 15, yPosition + 10);

  yPosition += 40;

  profile.educations.forEach(edu => {
    if (yPosition > doc.page.height - 100) {
      doc.addPage();
      yPosition = margin;
    }

    doc.fillColor(primaryColor)
      .font('bold')
      .fontSize(10)
      .text(edu.degree || 'Degree', margin, yPosition);

    doc.fillColor(secondaryColor)
      .font('medium')
      .fontSize(9)
      .text(edu.institution || 'Institution', margin + 200, yPosition);

    const details = [
      formatDate(edu.startDate) + ' - ' + (edu.currentlyEnrolled ? 'Present' : formatDate(edu.endDate)),
      edu.fieldOfStudy,
      edu.cgpa ? `GPA: ${edu.cgpa.toFixed(2)}` : null
    ].filter(Boolean).join(' | ');

    doc.fillColor(lightText)
      .font('regular')
      .fontSize(8)
      .text(details, margin + contentWidth - 100, yPosition, {
        align: 'right',
      });

    yPosition += 20;
  });

  // Skills Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 30)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('SKILLS', margin + 15, yPosition + 10);

  yPosition += 40;

  if (profile.skills?.length) {
    const skillsPerColumn = 6;
    const columnWidth = contentWidth / 3;
    
    const skillCategories = profile.skills.reduce((acc, skill) => {
      const category = skill.category || 'Technical';
      if (!acc[category]) acc[category] = [];
      acc[category].push(skill.name || skill);
      return acc;
    }, {});

    Object.entries(skillCategories).forEach(([category, skills]) => {
      doc.fillColor(primaryColor)
        .font('medium')
        .fontSize(10)
        .text(category.toUpperCase(), margin, yPosition);

      yPosition += 15;

      doc.fillColor(textColor)
        .font('regular')
        .fontSize(9)
        .list(skills, margin + 15, yPosition, {
          width: contentWidth - 30,
          bulletRadius: 2,
          lineGap: 3,
          columns: 2,
          columnGap: 30
        });

      yPosition += Math.ceil(skills.length / 2) * 15 + 10;
    });
  }

  // Footer
  doc.fillColor(lightText)
    .font('regular')
    .fontSize(8)
    .text('Generated by Professional CV Builder', margin, doc.page.height - 30, {
      width: contentWidth,
      align: 'center',
    });
}

// Executive Professional Template (Updated)
function generateExecutiveTemplate(doc, profile) {
  const margin = 40;
  const contentWidth = doc.page.width - margin * 2;
  
  // Colors
  const primaryColor = '#1e3a8a'; // Dark blue
  const secondaryColor = '#6b7280'; // Gray
  const accentColor = '#dc2626'; // Red
  const sectionBg = '#f0f4f8';
  const textColor = '#333333';

  // Header with color
  doc.fillColor(primaryColor)
    .rect(0, 0, doc.page.width, 120)
    .fill();

  doc.fillColor('#ffffff')
    .font('bold')
    .fontSize(28)
    .text(profile.name?.toUpperCase() || 'FULL NAME', margin, 50, {
      width: contentWidth,
      align: 'center',
    });

  if (profile.title) {
    doc.fillColor('#ffffff')
      .font('medium')
      .fontSize(16)
      .text(profile.title.toUpperCase(), margin, 85, {
        width: contentWidth,
        align: 'center',
      });
  }

  let yPosition = 150;

  // Contact Info Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 80)
    .fill();

  const contactInfo = [
    profile.email,
    profile.phone,
    profile.address,
    profile.linkedin ? `LinkedIn: ${profile.linkedin}` : null,
    profile.website ? `Website: ${profile.website}` : null
  ].filter(Boolean);

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('CONTACT INFORMATION', margin + 15, yPosition + 20);

  yPosition += 40;

  const contactCol1 = margin + 15;
  const contactCol2 = margin + contentWidth/2;

  contactInfo.forEach((item, index) => {
    const col = index % 2 === 0 ? contactCol1 : contactCol2;
    const row = Math.floor(index / 2) * 20;
    
    doc.fillColor(textColor)
      .font('regular')
      .fontSize(10)
      .text(item, col, yPosition + row, {
        width: contentWidth/2 - 30,
      });
  });

  yPosition += 100;

  // Summary Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 100)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('EXECUTIVE SUMMARY', margin + 15, yPosition + 20);

  if (profile.objective) {
    doc.fillColor(textColor)
      .font('regular')
      .fontSize(10)
      .text(profile.objective, margin + 15, yPosition + 40, {
        width: contentWidth - 30,
        lineGap: 5,
      });
  }

  yPosition += 120;

  // Core Competencies Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 30)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('CORE COMPETENCIES', margin + 15, yPosition + 10);

  yPosition += 40;

  if (profile.skills?.length) {
    const skillsPerColumn = Math.ceil(profile.skills.length / 3);
    const columnWidth = contentWidth / 3;
    
    for (let i = 0; i < 3; i++) {
      const columnX = margin + (i * columnWidth);
      const columnSkills = profile.skills.slice(i * skillsPerColumn, (i + 1) * skillsPerColumn);
      
      columnSkills.forEach((skill, index) => {
        doc.fillColor(textColor)
          .font('regular')
          .fontSize(9)
          .list([skill.name || skill], columnX + 15, yPosition + (index * 15), {
            width: columnWidth - 30,
            bulletRadius: 2
          });
      });
    }
    
    yPosition += skillsPerColumn * 15 + 30;
  }

  // Experience Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 30)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('PROFESSIONAL EXPERIENCE', margin + 15, yPosition + 10);

  yPosition += 40;

  if (profile.experiences?.length) {
    profile.experiences.forEach(exp => {
      if (yPosition > doc.page.height - 150) {
        doc.addPage();
        yPosition = margin;
      }

      doc.fillColor(primaryColor)
        .font('bold')
        .fontSize(10)
        .text(exp.position || 'Position', margin, yPosition);

      doc.fillColor(accentColor)
        .font('medium')
        .fontSize(9)
        .text(exp.company || 'Company', margin + 200, yPosition);

      const dateText = `${formatDate(exp.startDate)} - ${
        exp.currentlyWorking ? 'Present' : formatDate(exp.endDate)
      }`;

      doc.fillColor(secondaryColor)
        .font('regular')
        .fontSize(8)
        .text(dateText, margin + contentWidth - 100, yPosition, {
          align: 'right',
        });

      yPosition += 15;

      if (exp.description) {
        const bullets = exp.description.split('\n').filter(Boolean);
        bullets.forEach(point => {
          doc.fillColor(textColor)
            .font('regular')
            .fontSize(9)
            .list([point.trim()], margin + 15, yPosition, {
              width: contentWidth - 30,
              bulletRadius: 2,
              lineGap: 3,
            });

          yPosition += doc.heightOfString(point, { width: contentWidth - 30 }) + 5;
        });
      }

      yPosition += 15;
    });
  }

  // Education Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 30)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('EDUCATION', margin + 15, yPosition + 10);

  yPosition += 40;

  profile.educations.forEach(edu => {
    if (yPosition > doc.page.height - 100) {
      doc.addPage();
      yPosition = margin;
    }

    doc.fillColor(primaryColor)
      .font('bold')
      .fontSize(10)
      .text(edu.degree || 'Degree', margin, yPosition);

    doc.fillColor(accentColor)
      .font('medium')
      .fontSize(9)
      .text(edu.institution || 'Institution', margin + 200, yPosition);

    const details = [
      formatDate(edu.startDate) + ' - ' + (edu.currentlyEnrolled ? 'Present' : formatDate(edu.endDate)),
      edu.fieldOfStudy,
      edu.cgpa ? `GPA: ${edu.cgpa.toFixed(2)}` : null
    ].filter(Boolean).join(' | ');

    doc.fillColor(secondaryColor)
      .font('regular')
      .fontSize(8)
      .text(details, margin + contentWidth - 100, yPosition, {
        align: 'right',
      });

    yPosition += 20;
  });

  // Footer
  doc.fillColor(secondaryColor)
    .font('regular')
    .fontSize(8)
    .text('Prepared for ' + profile.name, margin, doc.page.height - 30, {
      width: contentWidth,
      align: 'center',
    });
}

// ATS-Friendly Template (Updated)
function generateATSTemplate(doc, profile) {
  const margin = 40;
  const contentWidth = doc.page.width - margin * 2;
  
  // Colors
  const primaryColor = '#000000'; // Black
  const secondaryColor = '#333333'; // Dark gray
  const sectionBg = '#f5f5f5';
  const textColor = '#333333';

  // Header with color
  doc.fillColor(primaryColor)
    .rect(0, 0, doc.page.width, 120)
    .fill();

  doc.fillColor('#ffffff')
    .font('bold')
    .fontSize(28)
    .text(profile.name?.toUpperCase() || 'FULL NAME', margin, 50, {
      width: contentWidth,
      align: 'center',
    });

  if (profile.title) {
    doc.fillColor('#ffffff')
      .font('medium')
      .fontSize(16)
      .text(profile.title, margin, 85, {
        width: contentWidth,
        align: 'center',
      });
  }

  let yPosition = 150;

  // Contact Info Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 80)
    .fill();

  const contactInfo = [
    profile.email,
    profile.phone,
    profile.address,
    profile.linkedin ? `LinkedIn: ${profile.linkedin}` : null,
    profile.website ? `Website: ${profile.website}` : null
  ].filter(Boolean);

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('CONTACT INFORMATION', margin + 15, yPosition + 20);

  yPosition += 40;

  const contactCol1 = margin + 15;
  const contactCol2 = margin + contentWidth/2;

  contactInfo.forEach((item, index) => {
    const col = index % 2 === 0 ? contactCol1 : contactCol2;
    const row = Math.floor(index / 2) * 20;
    
    doc.fillColor(textColor)
      .font('regular')
      .fontSize(10)
      .text(item, col, yPosition + row, {
        width: contentWidth/2 - 30,
      });
  });

  yPosition += 100;

  // Summary Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 100)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('PROFESSIONAL SUMMARY', margin + 15, yPosition + 20);

  if (profile.objective) {
    doc.fillColor(textColor)
      .font('regular')
      .fontSize(10)
      .text(profile.objective, margin + 15, yPosition + 40, {
        width: contentWidth - 30,
        lineGap: 5,
      });
  }

  yPosition += 120;

  // Experience Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 30)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('PROFESSIONAL EXPERIENCE', margin + 15, yPosition + 10);

  yPosition += 40;

  if (profile.experiences?.length) {
    profile.experiences.forEach(exp => {
      if (yPosition > doc.page.height - 150) {
        doc.addPage();
        yPosition = margin;
      }

      doc.fillColor(primaryColor)
        .font('bold')
        .fontSize(10)
        .text(exp.position || 'Position', margin, yPosition);

      doc.fillColor(secondaryColor)
        .font('medium')
        .fontSize(9)
        .text(exp.company || 'Company', margin + 200, yPosition);

      const dateText = `${formatDate(exp.startDate)} - ${
        exp.currentlyWorking ? 'Present' : formatDate(exp.endDate)
      }`;

      doc.fillColor(secondaryColor)
        .font('regular')
        .fontSize(8)
        .text(dateText, margin + contentWidth - 100, yPosition, {
          align: 'right',
        });

      yPosition += 15;

      if (exp.description) {
        const bullets = exp.description.split('\n').filter(Boolean);
        bullets.forEach(point => {
          doc.fillColor(textColor)
            .font('regular')
            .fontSize(9)
            .text(`• ${point.trim()}`, margin + 15, yPosition, {
              width: contentWidth - 30,
              lineGap: 4,
              indent: 10
            });

          yPosition += doc.heightOfString(point, { width: contentWidth - 30 }) + 5;
        });
      }

      yPosition += 10;
    });
  }

  // Education Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 30)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('EDUCATION', margin + 15, yPosition + 10);

  yPosition += 40;

  profile.educations.forEach(edu => {
    if (yPosition > doc.page.height - 100) {
      doc.addPage();
      yPosition = margin;
    }

    doc.fillColor(primaryColor)
      .font('bold')
      .fontSize(10)
      .text(edu.degree || 'Degree', margin, yPosition);

    doc.fillColor(secondaryColor)
      .font('medium')
      .fontSize(9)
      .text(edu.institution || 'Institution', margin + 200, yPosition);

    const details = [
      formatDate(edu.startDate) + ' - ' + (edu.currentlyEnrolled ? 'Present' : formatDate(edu.endDate)),
      edu.fieldOfStudy,
      edu.cgpa ? `GPA: ${edu.cgpa.toFixed(2)}` : null
    ].filter(Boolean).join(' | ');

    doc.fillColor(secondaryColor)
      .font('regular')
      .fontSize(8)
      .text(details, margin + contentWidth - 100, yPosition, {
        align: 'right',
      });

    yPosition += 20;
  });

  // Skills Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 30)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('SKILLS', margin + 15, yPosition + 10);

  yPosition += 40;

  if (profile.skills?.length) {
    const skillsText = profile.skills.map(skill => skill.name || skill).join(', ');
    doc.fillColor(textColor)
      .font('regular')
      .fontSize(10)
      .text(skillsText, margin + 15, yPosition, {
        width: contentWidth - 30,
        lineGap: 5,
      });
  }

  // Footer
  doc.fillColor(secondaryColor)
    .font('regular')
    .fontSize(8)
    .text('Generated by ATS-Friendly CV Builder', margin, doc.page.height - 30, {
      width: contentWidth,
      align: 'center',
    });
}

// Creative Professional Template (Updated)
function generateCreativeTemplate(doc, profile) {
  const margin = 40;
  const contentWidth = doc.page.width - margin * 2;
  
  // Colors
  const primaryColor = '#4f46e5'; // Indigo
  const secondaryColor = '#10b981'; // Emerald
  const accentColor = '#f59e0b'; // Amber
  const sectionBg = '#f0f4ff';
  const textColor = '#333333';

  // Header with color
  doc.fillColor(primaryColor)
    .rect(0, 0, doc.page.width, 120)
    .fill();

  doc.fillColor('#ffffff')
    .font('bold')
    .fontSize(28)
    .text(profile.name?.toUpperCase() || 'FULL NAME', margin, 50, {
      width: contentWidth,
      align: 'center',
    });

  if (profile.title) {
    doc.fillColor('#ffffff')
      .font('medium')
      .fontSize(16)
      .text(profile.title, margin, 85, {
        width: contentWidth,
        align: 'center',
      });
  }

  let yPosition = 150;

  // Contact Info Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 80)
    .fill();

  const contactItems = [
    { icon: '✉', text: profile.email },
    { icon: '📱', text: profile.phone },
    { icon: '🏠', text: profile.address },
    { icon: '🔗', text: profile.linkedin || profile.website }
  ].filter(item => item.text);

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('CONTACT INFORMATION', margin + 15, yPosition + 20);

  yPosition += 40;

  const contactCol1 = margin + 15;
  const contactCol2 = margin + contentWidth/2;

  contactItems.forEach((item, index) => {
    const col = index % 2 === 0 ? contactCol1 : contactCol2;
    const row = Math.floor(index / 2) * 20;
    
    doc.fillColor(textColor)
      .font('regular')
      .fontSize(10)
      .text(`${item.icon} ${item.text}`, col, yPosition + row, {
        width: contentWidth/2 - 30,
      });
  });

  yPosition += 100;

  // Summary Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 100)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('PROFESSIONAL PROFILE', margin + 15, yPosition + 20);

  if (profile.objective) {
    doc.fillColor(textColor)
      .font('regular')
      .fontSize(10)
      .text(profile.objective, margin + 15, yPosition + 40, {
        width: contentWidth - 30,
        lineGap: 5,
      });
  }

  yPosition += 120;

  // Experience Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 30)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('WORK EXPERIENCE', margin + 15, yPosition + 10);

  yPosition += 40;

  if (profile.experiences?.length) {
    profile.experiences.forEach(exp => {
      if (yPosition > doc.page.height - 150) {
        doc.addPage();
        yPosition = margin;
      }

      doc.fillColor(primaryColor)
        .font('bold')
        .fontSize(10)
        .text(exp.position || 'Position', margin, yPosition);

      doc.fillColor(secondaryColor)
        .font('medium')
        .fontSize(9)
        .text(exp.company || 'Company', margin + 200, yPosition);

      const dateText = `${formatDate(exp.startDate)} - ${
        exp.currentlyWorking ? 'Present' : formatDate(exp.endDate)
      }`;

      doc.fillColor(accentColor)
        .font('regular')
        .fontSize(8)
        .text(dateText, margin + contentWidth - 100, yPosition, {
          align: 'right',
        });

      yPosition += 15;

      if (exp.description) {
        const bullets = exp.description.split('\n').filter(Boolean);
        bullets.forEach(point => {
          doc.fillColor(textColor)
            .font('regular')
            .fontSize(9)
            .list([point.trim()], margin + 15, yPosition, {
              width: contentWidth - 30,
              bulletRadius: 2,
              lineGap: 3,
            });

          yPosition += doc.heightOfString(point, { width: contentWidth - 30 }) + 5;
        });
      }

      yPosition += 15;
    });
  }

  // Education Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 30)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('EDUCATION', margin + 15, yPosition + 10);

  yPosition += 40;

  profile.educations.forEach(edu => {
    if (yPosition > doc.page.height - 100) {
      doc.addPage();
      yPosition = margin;
    }

    doc.fillColor(primaryColor)
      .font('bold')
      .fontSize(10)
      .text(edu.degree || 'Degree', margin, yPosition);

    doc.fillColor(secondaryColor)
      .font('medium')
      .fontSize(9)
      .text(edu.institution || 'Institution', margin + 200, yPosition);

    const details = [
      formatDate(edu.startDate) + ' - ' + (edu.currentlyEnrolled ? 'Present' : formatDate(edu.endDate)),
      edu.fieldOfStudy,
      edu.cgpa ? `GPA: ${edu.cgpa.toFixed(2)}` : null
    ].filter(Boolean).join(' | ');

    doc.fillColor(accentColor)
      .font('regular')
      .fontSize(8)
      .text(details, margin + contentWidth - 100, yPosition, {
        align: 'right',
      });

    yPosition += 20;
  });

  // Skills Section
  doc.fillColor(sectionBg)
    .rect(margin, yPosition, contentWidth, 30)
    .fill();

  doc.fillColor(primaryColor)
    .font('bold')
    .fontSize(12)
    .text('SKILLS & EXPERTISE', margin + 15, yPosition + 10);

  yPosition += 40;

  if (profile.skills?.length) {
    const skillsPerColumn = 6;
    const columnWidth = contentWidth / 3;
    
    const skillCategories = profile.skills.reduce((acc, skill) => {
      const category = skill.category || 'Technical';
      if (!acc[category]) acc[category] = [];
      acc[category].push(skill.name || skill);
      return acc;
    }, {});

    Object.entries(skillCategories).forEach(([category, skills]) => {
      doc.fillColor(primaryColor)
        .font('medium')
        .fontSize(10)
        .text(category.toUpperCase(), margin, yPosition);

      yPosition += 15;

      doc.fillColor(textColor)
        .font('regular')
        .fontSize(9)
        .list(skills, margin + 15, yPosition, {
          width: contentWidth - 30,
          bulletRadius: 2,
          lineGap: 3,
          columns: 2,
          columnGap: 30
        });

      yPosition += Math.ceil(skills.length / 2) * 15 + 10;
    });
  }

  // Footer
  doc.fillColor(secondaryColor)
    .font('regular')
    .fontSize(8)
    .text('Designed with Creative CV Builder', margin, doc.page.height - 30, {
      width: contentWidth,
      align: 'center',
    });
}

// Helper function to format dates
function formatDate(dateString) {
  if (!dateString) return 'Present';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) throw new Error('Invalid date');
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  } catch (err) {
    console.warn('Date formatting error:', err.message);
    return 'Present';
  }
}

// Profile validation
function validateProfileStructure(profile) {
  if (!profile) throw new Error('Profile data is required');
  
  const requiredFields = ['name', 'email', 'educations'];
  const missingFields = requiredFields.filter(field => !profile[field]);
  
  if (missingFields.length) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  if (!Array.isArray(profile.educations) || !profile.educations.length) {
    throw new Error('At least one education entry is required');
  }
  
  profile.educations.forEach(edu => {
    if (!edu.degree || !edu.institution) {
      throw new Error('Education entries require degree and institution');
    }
  });
  
  if (profile.experiences && !Array.isArray(profile.experiences)) {
    throw new Error('Experiences must be an array if provided');
  }
}

module.exports = { generateCV };