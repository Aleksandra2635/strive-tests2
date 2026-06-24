// max.js
require('dotenv').config();

// Проверка наличия токена и chat_id
if (!process.env.MAX_BOT_TOKEN || !process.env.MAX_CHAT_ID) {
  console.warn('⚠️ MAX_BOT_TOKEN или MAX_CHAT_ID не установлены в .env');
  console.warn('⚠️ Отправка в Max отключена');
  
  // Фолбэк-функции
  module.exports = {
    sendFinalReport: (summary) => console.log(`📊 Финальный отчёт (Max fallback):\n${summary}`)
  };
  return;
}

const MAX_API_URL = 'https://platform-api.max.ru/messages';

module.exports = {
  sendFinalReport: async (summary) => {
    const message = `📊 ФИНАЛЬНЫЙ ОТЧЁТ ТЕСТИРОВАНИЯ STRIVE\n` +
                    `⏱️ ${new Date().toLocaleString('ru-RU')}\n\n` +
                    `${summary}`;
    
    console.log('📤 Попытка отправки в Max...');
    console.log('💬 Chat ID:', process.env.MAX_CHAT_ID);
    
    try {
      const response = await fetch(`${MAX_API_URL}?chat_id=${process.env.MAX_CHAT_ID}`, {
        method: 'POST',
        headers: {
          'Authorization': process.env.MAX_BOT_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: message
        })
      });

      if (response.ok) {
        console.log('✅ Финальный отчёт успешно отправлен в Max!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ ОШИБКА отправки в Max:');
        console.error('   Статус:', response.status, response.statusText);
        console.error('   Ответ:', JSON.stringify(errorData, null, 2));
        
        if (response.status === 401) {
          console.error('💡 ОШИБКА 401: Неверный MAX_BOT_TOKEN');
        }
        if (response.status === 400) {
          console.error('💡 ОШИБКА 400: Неверный MAX_CHAT_ID или бот не добавлен в чат');
        }
      }
    } catch (err) {
      console.error('❌ КРИТИЧЕСКАЯ ОШИБКА отправки в Max:');
      console.error('   Сообщение:', err.message);
    }
  }
};