const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Проверка наличия токена и chat_id
if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
  console.warn('⚠️ TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не установлены в .env');
  console.warn('⚠️ Отправка в Telegram отключена');
  
  // Фолбэк-функции
  module.exports = {
    sendFinalReport: (summary) => console.log(`📊 Финальный отчёт:\n${summary}`),
    sendTestResult: () => {} // Пустая функция — не отправляем по каждому тесту
  };
  return;
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

module.exports = {
  sendFinalReport: (summary) => {
    const message = `📊 ФИНАЛЬНЫЙ ОТЧЁТ ТЕСТИРОВАНИЯ STRIVE\n` +
                    `⏱️ ${new Date().toLocaleString('ru-RU')}\n\n` +
                    `${summary}`;
    
    console.log('📤 Попытка отправки в Telegram...');
    console.log('💬 Chat ID:', process.env.TELEGRAM_CHAT_ID);
    
    bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message)
      .then(() => {
        console.log('✅ Финальный отчёт успешно отправлен в Telegram!');
      })
      .catch(err => {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА отправки в Telegram:');
        console.error('   Сообщение:', err.message);
        console.error('   Код ошибки:', err.code);
        console.error('   Параметры:', err.parameters);
        
        // Дополнительная проверка токена
        if (err.message.includes('401')) {
          console.error('💡 ОШИБКА 401: Неверный TELEGRAM_BOT_TOKEN');
        }
        if (err.message.includes('400')) {
          console.error('💡 ОШИБКА 400: Неверный TELEGRAM_CHAT_ID или бот не добавлен в чат');
        }
      });
  },
};