const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const xml2js = require('xml2js');

/**
 * ZIP 파일에서 XML 파일을 추출하고 파싱하는 유틸리티
 */
class CorpCodeUtil {
  /**
   * ZIP 파일에서 회사코드 정보를 추출하여 JSON으로 변환
   * @param {string} zipFilePath - 회사코드 ZIP 파일 경로
   * @param {string} outputPath - JSON 파일 저장 경로 (선택사항)
   * @returns {Promise<Array>} - 회사코드 정보 배열
   */
  static async extractCorpCodes(zipFilePath, outputPath = null) {
    try {
      console.log('ZIP 파일에서 회사코드 정보 추출 중...');
      
      // ZIP 파일 열기
      const zip = new AdmZip(zipFilePath);
      
      // CORPCODE.xml 파일 추출
      const zipEntries = zip.getEntries();
      const xmlEntry = zipEntries.find(entry => entry.entryName.toLowerCase() === 'corpcode.xml');
      
      if (!xmlEntry) {
        throw new Error('ZIP 파일 내에 CORPCODE.xml 파일이 없습니다.');
      }
      
      // XML 데이터 추출
      const xmlData = xmlEntry.getData().toString('utf8');
      
      // XML을 JSON으로 파싱
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlData);
      
      // 회사 정보 배열 추출
      const corpList = result.result.list;
      
      // JSON 파일로 저장 (선택사항)
      if (outputPath) {
        const jsonFilePath = path.join(outputPath, 'corpCodes.json');
        fs.writeFileSync(jsonFilePath, JSON.stringify(corpList, null, 2));
        console.log(`회사코드 정보가 JSON 파일로 저장되었습니다: ${jsonFilePath}`);
      }
      
      return corpList;
    } catch (error) {
      console.error('회사코드 정보 추출 중 오류 발생:', error.message);
      throw error;
    }
  }
  
  /**
   * 회사명으로 고유번호 찾기
   * @param {Array} corpList - 회사코드 정보 배열
   * @param {string} companyName - 검색할 회사명
   * @returns {Array} - 일치하는 회사 정보 배열
   */
  static findCorpByName(corpList, companyName) {
    return corpList.filter(corp => 
      corp.corp_name.includes(companyName)
    );
  }
  
  /**
   * 종목코드로 고유번호 찾기
   * @param {Array} corpList - 회사코드 정보 배열
   * @param {string} stockCode - 검색할 종목코드
   * @returns {object|null} - 일치하는 회사 정보
   */
  static findCorpByStockCode(corpList, stockCode) {
    return corpList.find(corp => 
      corp.stock_code === stockCode
    );
  }
}

module.exports = CorpCodeUtil; 