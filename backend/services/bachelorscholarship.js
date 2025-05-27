const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const PhDScholarship = require('../models/bachelorscholorship'); // Changed to PhD Scholarship model

// MongoDB connection
mongoose.connect('mongodb+srv://waqas:waqasmangi123@scholorfinder.qeygr.mongodb.net/scholarship_finder_prod?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// List of URLs to scrape (PhD-specific scholarships)
const urls = [
  'https://www.scholarshipsads.com/search/?nationality%5B%5D=&country%5B%5D=&degree%5B%5D=444&subject%5B%5D=&funding%5B%5D=',
  'https://www.scholarshipsads.com/search/?nationality%5B%5D=&country%5B%5D=&degree%5B%5D=444&subject%5B%5D=&funding%5B%5D=&page=2',
  'https://www.scholarshipsads.com/search/?nationality%5B%5D=&country%5B%5D=&degree%5B%5D=444&subject%5B%5D=&funding%5B%5D=&page=3'
];

// Function to scrape a single page
async function scrapePage(url) {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 60000 
    });

    const scholarships = await page.evaluate(() => {
      const results = [];
      const scholarshipCards = document.querySelectorAll('.card-info');

      scholarshipCards.forEach(card => {
        const name = card.querySelector('h3 a')?.innerText?.trim() || 'No Name';
        const link = card.querySelector('h3 a')?.getAttribute('href') || '#';
        const funding = card.querySelector('li i.icon-dollar')?.parentElement?.innerText?.trim() || 'Funding Not Specified';
        const university = card.querySelector('li i.icon-place')?.parentElement?.innerText?.trim() || 'University Not Specified';
        const educationLevel = 'PhD'; // Hardcoded since we're scraping PhD scholarships
        const subject = card.querySelector('li i.icon-book')?.parentElement?.innerText?.trim() || 'All Subjects';
        const studentType = card.querySelector('li i.icon-world')?.parentElement?.innerText?.trim() || 'International';
        const country = card.querySelector('li i.icon-map')?.parentElement?.innerText?.trim() || 'Country Not Specified';
        const deadline = card.querySelector('li i.icon-calendar')?.parentElement?.innerText?.trim() || 'Open Deadline';

        results.push({
          name,
          funding,
          university,
          educationLevel,
          subject,
          studentType,
          country,
          deadline,
          link: link.startsWith('http') ? link : `https://www.scholarshipsads.com${link}`,
          lastUpdated: new Date()
        });
      });

      return results;
    });

    return scholarships;
  } finally {
    await browser.close();
  }
}

// Function to scrape multiple pages and save data to MongoDB
async function scrapeAllPages(urls) {
  try {
    for (const url of urls) {
      console.log(`🌐 Scraping URL: ${url}`);
      const scholarships = await scrapePage(url);

      for (const scholarship of scholarships) {
        try {
          const existingScholarship = await PhDScholarship.findOne({ 
            $or: [
              { link: scholarship.link },
              { 
                name: scholarship.name,
                university: scholarship.university,
                deadline: scholarship.deadline
              }
            ]
          });
          
          if (!existingScholarship) {
            const newScholarship = new PhDScholarship(scholarship);
            await newScholarship.save();
            console.log(`✅ Saved: ${scholarship.name}`);
          } else {
            console.log(`⚠️ Duplicate found: ${scholarship.name}`);
          }
        } catch (saveError) {
          console.error(`❌ Error saving ${scholarship.name}:`, saveError.message);
        }
      }
    }
  } catch (error) {
    console.error('❌ Scraping error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB connection closed.');
  }
}

// Error handling for the entire process
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  mongoose.disconnect().finally(() => process.exit(1));
});

// Run the scraping process
(async () => {
  try {
    await scrapeAllPages(urls);
    console.log('🎉 PhD Scholarships scraping completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ PhD Scholarships scraping failed:', error);
    process.exit(1);
  }
})();