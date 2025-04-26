const fs = require('fs');
const path = require('path');

/**
 * 프로젝트에 필요한 디렉토리 구조를 생성
 */
function createProjectDirectories() {
  const dirs = [
    path.join(__dirname, '../data'),
    path.join(__dirname, '../src/examples'),
    path.join(__dirname, '../src/utils'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`디렉토리 생성: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    } else {
      console.log(`디렉토리 이미 존재: ${dir}`);
    }
  });

  console.log('모든 디렉토리 생성 완료');
}

// 디렉토리 생성 실행
createProjectDirectories(); 