const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const BachelorScholarship = require('./models/bachelorscholorship'); // Import the BachelorScholarship model

// MongoDB connection
mongoose.connect('mongodb+srv://waqas:waqasmangi123@scholorfinder.qeygr.mongodb.net/mydatabase', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// List of URLs to scrape (multiple pages and degrees)
const urls = [
  'https://www.scholarshipsads.com/search/?nationality%5B%5D=&country%5B%5D=&degree%5B%5D=439&subject%5B%5D=&funding%5B%5D=&page=1',
  'https://www.scholarshipsads.com/search/?nationality%5B%5D=&country%5B%5D=&degree%5B%5D=439&subject%5B%5D=&funding%5B%5D=&page=2',
  'https://www.scholarshipsads.com/search/?nationality%5B%5D=&country%5B%5D=&degree%5B%5D=439&subject%5B%5D=&funding%5B%5D=&page=3',
  'https://www.scholarshipsads.com/search/?nationality%5B%5D=&country%5B%5D=&degree%5B%5D=444&subject%5B%5D=&funding%5B%5D=',
  'https://www.scholarshipsads.com/search/?nationality%5B%5D=&country%5B%5D=&degree%5B%5D=441&subject%5B%5D=&funding%5B%5D=',
  'https://www.scholarshipsads.com/search/?nationality%5B%5D=&country%5B%5D=&degree%5B%5D=441&subject%5B%5D=&funding%5B%5D=&page=2',
];

// Function to scrape a single page
async function scrapePage(url) {
  const browser = await puppeteer.launch({ headless: true }); // Set to true for headless mode
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

  const scholarships = await page.evaluate(() => {
    const results = [];
    const scholarshipCards = document.querySelectorAll('.card-info');

    scholarshipCards.forEach(card => {
      const name = card.querySelector('h3 a')?.innerText || 'No Name';
      const link = card.querySelector('h3 a')?.getAttribute('href') || '#';
      const funding = card.querySelector('li i.icon-dollar')?.parentElement.innerText.trim() || 'No Funding Info';
      const university = card.querySelector('li i.icon-place')?.parentElement.innerText.trim() || 'No University Info';
      const educationLevel = card.querySelector('li i.icon-Bachelor2')?.parentElement.innerText.trim() || 'No Education Level';
      const subject = card.querySelector('li i.icon-book')?.parentElement.innerText.trim() || 'All Subjects';
      const studentType = card.querySelector('li i.icon-world')?.parentElement.innerText.trim() || 'Not specified';
      const country = card.querySelector('li i.icon-map')?.parentElement.innerText.trim() || 'Not specified';
      const deadline = card.querySelector('li i.icon-calendar')?.parentElement.innerText.trim() || 'No Deadline';

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
      });
    });

    return results;
  });

  await browser.close();
  return scholarships;
}

// Function to scrape multiple pages and save data to MongoDB
async function scrapeAllPages(urls) {
  for (const url of urls) {
    console.log(`Scraping URL: ${url}`);
    try {
      const scholarships = await scrapePage(url);

      for (const scholarship of scholarships) {
        const existingScholarship = await BachelorScholarship.findOne({ link: scholarship.link });
        
        if (!existingScholarship) {
          const newScholarship = new BachelorScholarship(scholarship);
          await newScholarship.save();
          console.log(`Saved: ${scholarship.name}`);
        } else {
          console.log(`Duplicate found: ${scholarship.name}`);
        }
      }
    } catch (error) {
      console.error(`Error scraping URL ${url}:`, error);
    }
  }

  console.log('Bachelor Scholarships scraping process completed for all URLs.');
}

// Run the scraping function with the list of URLs
scrapeAllPages(urls);
