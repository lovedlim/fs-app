const axios = require('axios');
const config = require('./config');
const fs = require('fs');
const path = require('path');

/**
 * Open DART API 클라이언트
 */
class DartApiClient {
  constructor() {
    this.apiKey = config.openDartApi.apiKey;
    this.baseUrl = config.openDartApi.baseUrl;
    
    // API 키 유효성 검사
    if (!this.apiKey || this.apiKey === 'your_api_key_here') {
      console.error('⚠️ 유효한 API 키가 설정되지 않았습니다. .env 파일에 OPEN_DART_API_KEY를 설정해주세요.');
    }
  }

  /**
   * 회사 기본정보 조회
   * @param {string} corpCode - 고유번호
   * @returns {Promise<object>} - 회사 기본정보
   */
  async getCompanyInfo(corpCode) {
    try {
      const response = await axios.get(`${this.baseUrl}/company.json`, {
        params: {
          crtfc_key: this.apiKey,
          corp_code: corpCode
        }
      });
      
      // 응답 데이터 유효성 검사
      if (response.data.status !== '000') {
        throw new Error(`API 오류: [${response.data.status}] ${response.data.message}`);
      }
      
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        console.error('회사 정보 조회 중 API 오류:', error.response.data);
        throw new Error(`API 오류: ${error.response.data.message || '알 수 없는 오류'}`);
      }
      console.error('회사 정보 조회 중 오류 발생:', error.message);
      throw error;
    }
  }

  /**
   * 공시 정보 조회
   * @param {object} params - 검색 매개변수
   * @returns {Promise<object>} - 공시 정보 목록
   */
  async getDisclosureList(params) {
    try {
      const response = await axios.get(`${this.baseUrl}/list.json`, {
        params: {
          crtfc_key: this.apiKey,
          ...params
        }
      });
      
      // 응답 데이터 유효성 검사
      if (response.data.status !== '000') {
        throw new Error(`API 오류: [${response.data.status}] ${response.data.message}`);
      }
      
      return response.data;
    } catch (error) {
      if (error.response && error.response.data) {
        console.error('공시 정보 조회 중 API 오류:', error.response.data);
        throw new Error(`API 오류: ${error.response.data.message || '알 수 없는 오류'}`);
      }
      console.error('공시 정보 조회 중 오류 발생:', error.message);
      throw error;
    }
  }

  /**
   * 회사코드 파일 다운로드
   * @param {string} downloadPath - 저장할 경로 (기본값: 현재 디렉토리)
   * @returns {Promise<string>} - 다운로드된 파일 경로
   */
  async downloadCorpCodes(downloadPath = './') {
    try {
      console.log('회사코드 파일 다운로드 중...');
      
      // 요청 URL 설정
      const url = 'https://opendart.fss.or.kr/api/corpCode.xml';
      
      // 저장할 파일 경로 설정
      const fileName = 'corpCode.zip';
      const filePath = path.join(downloadPath, fileName);
      
      // 디렉토리 확인 및 생성
      if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath, { recursive: true });
      }
      
      // API 요청 및 파일 다운로드
      const response = await axios({
        method: 'get',
        url,
        params: {
          crtfc_key: this.apiKey
        },
        responseType: 'arraybuffer' // 바이너리 데이터로 받기 위해 responseType 변경
      });
      
      // 오류 응답인지 확인 (XML 형식의 오류 메시지)
      if (response.headers['content-type'].includes('application/xml') || 
          response.headers['content-type'].includes('text/xml')) {
        const xmlData = response.data.toString('utf8');
        if (xmlData.includes('<status>') && !xmlData.includes('<status>000</status>')) {
          const statusMatch = xmlData.match(/<status>([^<]+)<\/status>/);
          const messageMatch = xmlData.match(/<message>([^<]+)<\/message>/);
          
          const status = statusMatch ? statusMatch[1] : '알 수 없음';
          const message = messageMatch ? messageMatch[1] : '알 수 없는 오류';
          
          throw new Error(`API 오류: [${status}] ${message}`);
        }
      }
      
      // 파일로 저장
      fs.writeFileSync(filePath, response.data);
      
      console.log(`회사코드 파일이 성공적으로 다운로드되었습니다: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('회사코드 파일 다운로드 중 오류 발생:', error.message);
      throw error;
    }
  }
}

module.exports = new DartApiClient(); 