const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

/**
 * 회사코드 데이터베이스 관리
 */
class CompanyDatabase {
  constructor(dbPath = path.join(process.env.NODE_ENV === 'production' ? '/app/data' : __dirname, '../../data/companies.db')) {
    this.dbPath = dbPath;
    this.db = null;
    // 데이터 디렉토리 확인 및 생성
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`데이터 디렉토리가 생성되었습니다: ${dataDir}`);
      } catch (error) {
        console.error(`데이터 디렉토리 생성 오류: ${error.message}`);
      }
    }
  }

  /**
   * 데이터베이스 연결
   * @returns {Promise<sqlite3.Database>} 데이터베이스 객체
   */
  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('데이터베이스 연결 오류:', err.message);
          reject(err);
          return;
        }
        console.log('회사코드 데이터베이스에 연결되었습니다.');
        resolve(this.db);
      });
    });
  }

  /**
   * 데이터베이스 연결 종료
   * @returns {Promise<void>}
   */
  async close() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }
      
      this.db.close((err) => {
        if (err) {
          console.error('데이터베이스 연결 종료 오류:', err.message);
          reject(err);
          return;
        }
        console.log('데이터베이스 연결이 종료되었습니다.');
        this.db = null;
        resolve();
      });
    });
  }

  /**
   * 테이블 생성
   * @returns {Promise<void>}
   */
  async createTables() {
    if (!this.db) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS companies (
          corp_code TEXT PRIMARY KEY,
          corp_name TEXT NOT NULL,
          corp_eng_name TEXT,
          stock_code TEXT,
          modify_date TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_corp_name ON companies(corp_name);
        CREATE INDEX IF NOT EXISTS idx_stock_code ON companies(stock_code);
      `;
      
      this.db.exec(sql, (err) => {
        if (err) {
          console.error('테이블 생성 오류:', err.message);
          reject(err);
          return;
        }
        console.log('데이터베이스 테이블이 생성되었습니다.');
        resolve();
      });
    });
  }

  /**
   * JSON 파일에서 회사 정보를 임포트
   * @param {string} jsonFilePath - corpCodes.json 파일 경로
   * @returns {Promise<number>} 임포트된 레코드 수
   */
  async importFromJson(jsonFilePath) {
    if (!this.db) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      // 파일 읽기
      fs.readFile(jsonFilePath, 'utf8', (err, data) => {
        if (err) {
          console.error('JSON 파일 읽기 오류:', err.message);
          reject(err);
          return;
        }

        // JSON 파싱
        let companies;
        try {
          companies = JSON.parse(data);
        } catch (e) {
          console.error('JSON 파싱 오류:', e.message);
          reject(e);
          return;
        }

        // 트랜잭션 시작
        this.db.serialize(() => {
          this.db.run('BEGIN TRANSACTION');

          // 기존 데이터 삭제
          this.db.run('DELETE FROM companies', (err) => {
            if (err) {
              console.error('기존 데이터 삭제 오류:', err.message);
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }

            // 준비된 문장
            const stmt = this.db.prepare(`
              INSERT INTO companies (corp_code, corp_name, corp_eng_name, stock_code, modify_date)
              VALUES (?, ?, ?, ?, ?)
            `);

            // 데이터 삽입
            let count = 0;
            for (const company of companies) {
              stmt.run(
                company.corp_code,
                company.corp_name,
                company.corp_eng_name || '',
                company.stock_code || '',
                company.modify_date || '',
                (err) => {
                  if (err) {
                    console.error('데이터 삽입 오류:', err.message);
                    this.db.run('ROLLBACK');
                    stmt.finalize();
                    reject(err);
                    return;
                  }
                }
              );
              count++;
              
              // 진행 상황 로깅 (10,000개마다)
              if (count % 10000 === 0) {
                console.log(`${count}개 회사 정보 임포트 중...`);
              }
            }

            // 문장 종료
            stmt.finalize((err) => {
              if (err) {
                console.error('문장 종료 오류:', err.message);
                this.db.run('ROLLBACK');
                reject(err);
                return;
              }

              // 트랜잭션 커밋
              this.db.run('COMMIT', (err) => {
                if (err) {
                  console.error('트랜잭션 커밋 오류:', err.message);
                  this.db.run('ROLLBACK');
                  reject(err);
                  return;
                }

                console.log(`총 ${count}개 회사 정보가 성공적으로 임포트되었습니다.`);
                resolve(count);
              });
            });
          });
        });
      });
    });
  }

  /**
   * 회사명으로 회사 정보 검색
   * @param {string} companyName - 검색할 회사명
   * @returns {Promise<Array>} - 검색 결과 배열
   */
  async searchByName(companyName) {
    if (!this.db) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM companies 
        WHERE corp_name LIKE ? 
        ORDER BY 
          CASE WHEN corp_name = ? THEN 0
               WHEN corp_name LIKE ? || '%' THEN 1
               ELSE 2
          END,
          LENGTH(corp_name),
          corp_name
        LIMIT 30
      `;
      
      this.db.all(sql, [`%${companyName}%`, companyName, companyName], (err, rows) => {
        if (err) {
          console.error('회사명 검색 오류:', err.message);
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  /**
   * 종목코드로 회사 정보 검색
   * @param {string} stockCode - 검색할 종목코드
   * @returns {Promise<object|null>} - 검색 결과
   */
  async searchByStockCode(stockCode) {
    if (!this.db) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM companies WHERE stock_code = ? LIMIT 1';
      
      this.db.get(sql, [stockCode], (err, row) => {
        if (err) {
          console.error('종목코드 검색 오류:', err.message);
          reject(err);
          return;
        }
        resolve(row || null);
      });
    });
  }

  /**
   * 고유번호로 회사 정보 검색
   * @param {string} corpCode - 검색할 고유번호
   * @returns {Promise<object|null>} - 검색 결과
   */
  async getByCorpCode(corpCode) {
    if (!this.db) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM companies WHERE corp_code = ? LIMIT 1';
      
      this.db.get(sql, [corpCode], (err, row) => {
        if (err) {
          console.error('고유번호 검색 오류:', err.message);
          reject(err);
          return;
        }
        resolve(row || null);
      });
    });
  }
}

module.exports = CompanyDatabase; 