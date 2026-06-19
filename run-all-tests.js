// run-all-tests.js
const { exec } = require('child_process');
const { sendFinalReport } = require('./telegram');
const fs = require('fs');

// Создаём общий лог-файл
const logFile = `test-log-${new Date().toISOString().split('T')[0]}.txt`;

function log(message) {
  const timestamp = new Date().toLocaleString('ru-RU');
  const line = `[${timestamp}] ${message}\n`;
  console.log(line);
  fs.appendFileSync(logFile, line);
}

// Список тестов с метаданными
const tests = [
  { 
    name: 'Доступность сайта', 
    script: 'node siteAvailabilityTest.js', 
    successFile: 'site-available.png',
    duration: 0,
    status: 'pending',
    logs: [] // ← ДОБАВЛЕНО: массив для логов каждого теста
  },
  { 
    name: 'Запрос на демонстрацию', // <<< НОВЫЙ ТЕСТ ЗДЕСЬ
    script: 'node siteZaprosDem.js', 
    successFile: 'zapros-demo-success.png',
    duration: 0,
    status: 'pending',
    logs: []
  },
  { 
    name: 'Регистрация', 
    script: 'node registration.js', 
    successFile: 'registration-success.png',
    duration: 0,
    status: 'pending',
    logs: []
  },
  { 
    name: 'Логин', 
    script: 'node login.js', 
    successFile: 'login-success.png',
    duration: 0,
    status: 'pending',
    logs: []
  },
  { 
    name: 'Оплата', 
    script: 'node login_oplata_Test.js', 
    successFile: 'payment-page.png',
    duration: 0,
    status: 'pending',
    logs: []
  },
  { 
    name: 'Отмена заказа', 
    script: 'node ordercancellation.js', 
    successFile: 'cancellation-confirmation.png',
    duration: 0,
    status: 'pending',
    logs: []
  },
  { 
    name: 'Cоздание рабочего пространства', 
    script: 'node createSpace.js', 
    successFile: 'workspace-created.png',
    duration: 0,
    status: 'pending',
    logs: []
  },
  { 
    name: 'Cоздание проекта', 
    script: 'node createProject.js', 
    successFile: 'project-created.png',
    duration: 0,
    status: 'pending',
    logs: []
  },
  { 
    name: 'Удаление пользователя', 
    script: 'node deleteUserTest.js', 
    successFile: 'user-deleted.png',
    duration: 0,
    status: 'pending',
    logs: []
  }
];

let currentTestIndex = 0;
let startTime = Date.now();
let isGeneratingReport = false;

// ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ ОШИБОК (с async/await)
process.on('uncaughtException', async (error) => {
  console.error('\n💥 КРИТИЧЕСКАЯ ОШИБКА:', error.message);
  if (!isGeneratingReport) {
    await generateFinalReport();
  }
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n⚠️ Получен сигнал завершения');
  if (!isGeneratingReport) {
    await generateFinalReport();
  }
  process.exit(0);
});

function runNextTest() {
  if (currentTestIndex >= tests.length) {
    setImmediate(async () => {
      await generateFinalReport();
    });
    return;
  }

  const test = tests[currentTestIndex];
  const testStart = Date.now();
  
  log(`\n🚀 Запуск теста [${currentTestIndex + 1}/${tests.length}]: ${test.name}`);
  
  const child = exec(test.script, { cwd: process.cwd() });
  
  // Собираем логи из stdout и stderr каждого теста
  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    test.logs.push(...lines);
    process.stdout.write(data);
  });
  
  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    test.logs.push(...lines);
    process.stderr.write(data);
  });
  
  child.on('exit', (code) => {
    const duration = Math.round((Date.now() - testStart) / 1000);
    test.duration = duration;
    test.status = code === 0 ? 'passed' : 'failed';
    
    if (code === 0) {
      log(`✅ Тест "${test.name}" успешно завершён (${duration} сек)`);
    } else {
      log(`❌ Тест "${test.name}" завершился с ошибкой (${duration} сек)`);
    }
    
    currentTestIndex++;
    setTimeout(runNextTest, 1000);
  });
  
  // Таймаут для каждого теста
  setTimeout(() => {
    if (test.status === 'pending') {
      test.status = 'failed';
      test.duration = Math.round((Date.now() - testStart) / 1000);
      log(`⏰ Тест "${test.name}" превысил время ожидания (${test.duration} сек)`);
      try { child.kill(); } catch (e) {}
      currentTestIndex++;
      setTimeout(runNextTest, 1000);
    }
  }, 300000);
}

async function generateFinalReport() {
  if (isGeneratingReport) return;
  isGeneratingReport = true;
  
  const totalTime = Math.round((Date.now() - startTime) / 1000);
  const passed = tests.filter(t => t.status === 'passed').length;
  const failed = tests.filter(t => t.status === 'failed').length;
  
  // Формируем основной отчёт
  let report = `✅ Успешно: ${passed}\n`;
  report += `❌ Ошибок: ${failed}\n`;
  report += `⏱️ Всего времени: ${totalTime} сек\n\n`;
  
  // Детали по каждому тесту
  report += '📋 Детали тестов:\n';
  tests.forEach((test, index) => {
    const statusIcon = test.status === 'passed' ? '✅' : '❌';
    report += `${statusIcon} ${index + 1}. ${test.name} — ${test.duration} сек\n`;
  });
  
  // ДОБАВЛЕНО: Подробные логи проваленных тестов
  const failedTests = tests.filter(t => t.status === 'failed');
  if (failedTests.length > 0) {
    report += `\n🔍 Подробные логи ошибок:\n`;
    failedTests.forEach((test, index) => {
      report += `\n❌ ${test.name}:\n`;
      // Показываем последние 10 строк логов (или все, если меньше 10)
      const relevantLogs = test.logs.slice(-10);
      relevantLogs.forEach(logLine => {
        // Убираем временные метки из логов для читаемости
        const cleanLog = logLine.replace(/^\[.*?\]\s*/, '');
        if (cleanLog.trim()) {
          report += `   • ${cleanLog}\n`;
        }
      });
    });
  }
  
  // Итоговое сообщение
  const summary = failed === 0 
    ? `🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!\n${report}`
    : `⚠️ НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ (${failed}/${tests.length})\n${report}`;
  
    log('\n' + '='.repeat(50));
    log('📊 ФИНАЛЬНЫЙ ОТЧЁТ ТЕСТИРОВАНИЯ STRIVE\n' + '='.repeat(50));
    log(summary);
    log('='.repeat(50) + '\n');
    
    await sendFinalReport(summary);
  }
  
  // Запускаем тесты
  log('🏁 Начало запуска тестов STRIVE');
  runNextTest();