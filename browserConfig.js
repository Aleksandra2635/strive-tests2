require('dotenv').config();

module.exports = {
  getBrowserOptions: () => {
    const isCI = process.env.CI === 'true';
    const headless = process.env.HEADLESS === 'true' || isCI;
    
    return {
      headless: headless,
      args: [
        '--remote-allow-origins=*',
        '--disable-web-security',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-setuid-sandbox',
        '--no-first-run',
        '--no-service-autorun',
        '--password-store=basic'
      ]
    };
  },

  getTimeouts: () => {
    const isCI = process.env.CI === 'true';
    return {
      // Увеличены таймауты для CI
      navigation: isCI ? 120000 : 60000,    // 120 сек вместо 60
      selector: isCI ? 90000 : 30000,       // 90 сек вместо 30  
      email: isCI ? 300000 : 180000         // 300 сек для email
    };
  }
};