const Imap = require('imap');
const { simpleParser } = require('mailparser');
const cheerio = require('cheerio');
const fs = require('fs');

class EmailReader {
  constructor(host, username, password) {
    this.host = host;
    this.username = username;
    this.password = password;
    
    if (host.includes('yandex')) {
      this.imapConfig = {
        user: username,
        password: password,
        host: 'imap.yandex.ru',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000
      };
    } else if (host.includes('mail.ru') || host.includes('inbox.ru') || host.includes('bk.ru')) {
      this.imapConfig = {
        user: username,
        password: password,
        host: 'imap.mail.ru',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000
      };
    } else {
      this.imapConfig = {
        user: username,
        password: password,
        host: host,
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000
      };
    }
  }

  async getConfirmationCode(maxAttempts = 15, delay = 6000) {
    console.log('\n📧 Ожидание письма с кодом подтверждения...');
    console.log(`⏱️  Максимум ${maxAttempts} попыток, задержка ${delay / 1000} сек\n`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔍 Попытка ${attempt}/${maxAttempts}...`);
      
      try {
        const code = await this._getLatestEmailCode();
        if (code) return code;
      } catch (error) {
        console.warn(`⚠️ Попытка ${attempt} не удалась: ${error.message}`);
      }
      
      if (attempt < maxAttempts) {
        console.log(`⏳ Ждём ${delay / 1000} сек...\n`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('❌ Код подтверждения не найден после всех попыток');
  }

  async _getLatestEmailCode() {
    const self = this;
    
    return new Promise((resolve, reject) => {
      const imap = new Imap(this.imapConfig);
      let isResolved = false;  // Флаг, чтобы не вызывать resolve/reject дважды
      
      // Функция гарантированного закрытия соединения
      const safeEnd = () => {
        try {
          if (imap && imap.state !== 'disconnected') {
            imap.end();
          }
        } catch (e) {
          // Игнорируем ошибки при закрытии
        }
      };
      
      // Функция завершения с ошибкой
      const fail = (error) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(connectionTimeout);
          safeEnd();
          reject(error);
        }
      };
      
      // Функция успешного завершения
      const success = (result) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(connectionTimeout);
          safeEnd();
          resolve(result);
        }
      };

      let connectionTimeout = setTimeout(() => {
        fail(new Error('⏰ Таймаут подключения к IMAP серверу'));
      }, 15000);

      imap.once('ready', () => {
        clearTimeout(connectionTimeout);
        
        imap.openBox('INBOX', false, (err) => {
          if (err) {
            return fail(new Error(`Ошибка открытия папки: ${err.message}`));
          }

          // ИЩЕМ ТОЛЬКО ПИСЬМА С ТЕМОЙ "Подтвердите электронную почту"
          imap.search([['SUBJECT', 'Подтвердите электронную почту']], (err, results) => {
            if (err) {
              return fail(new Error(`Ошибка поиска: ${err.message}`));
            }

            if (!results || results.length === 0) {
              console.log('📭 Нет писем с темой "Подтвердите электронную почту"');
              return success(null);
            }

            // Сортируем по UID и берём самое свежее
            results.sort((a, b) => a - b);
            const latestMessageId = results[results.length - 1];
            
            console.log(`📬 Найдено ${results.length} писем с темой "Подтвердите электронную почту", последнее UID: ${latestMessageId}`);
            
            const f = imap.fetch(latestMessageId, { bodies: '' });

            f.on('message', (msg) => {
              msg.on('body', async (stream) => {
                try {
                  const parsed = await simpleParser(stream);
                  
                  console.log(`📧 От: ${parsed.from?.text || 'неизвестно'}`);
                  console.log(`📧 Тема: ${parsed.subject || 'без темы'}`);
                  
                  const emailText = parsed.text || parsed.html;
                  if (emailText) {
                    fs.writeFileSync('latest_email.txt', emailText, 'utf8');
                  }
                  
                  const code = self._parseCodeFromHtml(parsed.html || parsed.text);
                  
                  if (code) {
                    console.log(`✅ Найден код: ${code}`);
                    success(code);
                  } else {
                    console.log('❌ Код не найден в письме');
                    success(null);
                  }
                } catch (parseErr) {
                  fail(new Error(`Ошибка парсинга: ${parseErr.message}`));
                }
              });
            });

            f.once('error', (err) => {
              fail(new Error(`Ошибка получения тела письма: ${err.message}`));
            });

            f.once('end', () => {
              // Не закрываем здесь — success/fail уже закроют
            });
          });
        });
      });

      imap.once('error', (err) => {
        fail(new Error(`IMAP ошибка: ${err.message}`));
      });

      imap.connect();
    });
  }

  _parseCodeFromHtml(html) {
    if (!html) return null;
    
    console.log('\n🔍 Поиск кода в письме...');
    
    const $ = cheerio.load(html);
    const text = $.text();
    const numbers = text.match(/\b\d{4}\b/g);
    
    if (numbers && numbers.length > 0) {
      console.log(`✅ Найдены числа: ${numbers.join(', ')}`);
      const code = numbers[0];
      console.log(`🎯 Выбран код: ${code}`);
      return code;
    }
    
    const elements = $('td, th, div, span, p, font');
    for (let el of elements) {
      const text = $(el).text().trim();
      const match = text.match(/\b(\d{4})\b/);
      if (match) {
        console.log(`✅ Найден код в элементе: ${match[1]}`);
        return match[1];
      }
    }
    
    console.log('❌ Код не найден');
    return null;
  }
}

module.exports = EmailReader;