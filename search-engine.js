// 네로봇 검색 엔진 - AI API 없이 무료 검색 및 요약 기능
class NeroSearchEngine {
    constructor() {
        this.corsProxies = [
            'https://api.allorigins.win/get?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://thingproxy.freeboard.io/fetch/'
        ];
        this.currentProxyIndex = 0;
    }

    // 메인 검색 함수
    async search(query) {
        try {
            console.log(`네로봇이 "${query}"에 대해 검색 중...`);
            
            const results = await Promise.allSettled([
                this.searchWikipedia(query),
                this.searchDuckDuckGo(query),
                this.searchStackOverflow(query)
            ]);

            const validResults = results
                .filter(result => result.status === 'fulfilled' && result.value)
                .map(result => result.value);

            if (validResults.length === 0) {
                return {
                    success: false,
                    message: '검색 결과를 찾을 수 없습니다. 다른 키워드로 시도해보세요.'
                };
            }

            const summary = this.summarizeResults(validResults, query);
            return {
                success: true,
                summary: summary,
                sources: validResults.map(r => r.source),
                rawResults: validResults
            };

        } catch (error) {
            console.error('검색 오류:', error);
            return {
                success: false,
                message: '검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
            };
        }
    }

    // Wikipedia 검색
    async searchWikipedia(query) {
        try {
            const searchUrl = `https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
            const response = await this.fetchWithProxy(searchUrl);
            
            if (response.type === 'disambiguation') {
                // 동음이의어 페이지인 경우 첫 번째 옵션으로 재검색
                return null;
            }

            if (response.extract && response.extract.length > 50) {
                return {
                    source: 'Wikipedia',
                    title: response.title,
                    content: response.extract,
                    url: response.content_urls?.desktop?.page || '',
                    type: 'encyclopedia'
                };
            }
            return null;
        } catch (error) {
            console.log('Wikipedia 검색 실패:', error.message);
            return null;
        }
    }

    // DuckDuckGo Instant Answer API
    async searchDuckDuckGo(query) {
        try {
            const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
            const response = await this.fetchWithProxy(searchUrl);
            
            let content = '';
            if (response.Abstract && response.Abstract.length > 30) {
                content = response.Abstract;
            } else if (response.Definition && response.Definition.length > 30) {
                content = response.Definition;
            } else if (response.RelatedTopics && response.RelatedTopics.length > 0) {
                const firstTopic = response.RelatedTopics[0];
                if (firstTopic.Text) {
                    content = firstTopic.Text;
                }
            }

            if (content) {
                return {
                    source: 'DuckDuckGo',
                    title: response.Heading || query,
                    content: content,
                    url: response.AbstractURL || '',
                    type: 'general'
                };
            }
            return null;
        } catch (error) {
            console.log('DuckDuckGo 검색 실패:', error.message);
            return null;
        }
    }

    // Stack Overflow 검색 (프로그래밍 관련 질문용)
    async searchStackOverflow(query) {
        try {
            // 프로그래밍 관련 키워드가 포함된 경우만 검색
            const programmingKeywords = ['javascript', 'python', 'java', 'css', 'html', 'react', 'node', 'api', '코딩', '프로그래밍', '개발', 'error', 'function', 'class'];
            const isProgrammingQuery = programmingKeywords.some(keyword => 
                query.toLowerCase().includes(keyword)
            );

            if (!isProgrammingQuery) {
                return null;
            }

            const searchUrl = `https://api.stackexchange.com/2.3/search?order=desc&sort=relevance&intitle=${encodeURIComponent(query)}&site=stackoverflow`;
            const response = await fetch(searchUrl);
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const firstResult = data.items[0];
                return {
                    source: 'Stack Overflow',
                    title: firstResult.title,
                    content: `질문: ${firstResult.title}\n답변 수: ${firstResult.answer_count}개\n조회수: ${firstResult.view_count}회`,
                    url: firstResult.link,
                    type: 'programming'
                };
            }
            return null;
        } catch (error) {
            console.log('Stack Overflow 검색 실패:', error.message);
            return null;
        }
    }

    // CORS 프록시를 통한 fetch
    async fetchWithProxy(url) {
        for (let i = 0; i < this.corsProxies.length; i++) {
            try {
                const proxyUrl = this.corsProxies[this.currentProxyIndex] + encodeURIComponent(url);
                const response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                    timeout: 10000
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                let data = await response.json();
                
                // allorigins.win의 경우 contents 필드에 실제 데이터가 있음
                if (data.contents) {
                    data = JSON.parse(data.contents);
                }

                return data;
            } catch (error) {
                console.log(`프록시 ${this.currentProxyIndex} 실패:`, error.message);
                this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;
                
                if (i === this.corsProxies.length - 1) {
                    throw error;
                }
            }
        }
    }

    // 검색 결과 요약 (AI API 없이)
    summarizeResults(results, query) {
        if (results.length === 0) {
            return `"${query}"에 대한 정보를 찾을 수 없습니다.`;
        }

        // 키워드 추출
        const keywords = this.extractKeywords(query);
        
        // 결과들을 중요도별로 정렬
        const sortedResults = results.sort((a, b) => {
            const scoreA = this.calculateRelevanceScore(a.content, keywords);
            const scoreB = this.calculateRelevanceScore(b.content, keywords);
            return scoreB - scoreA;
        });

        // 요약 생성
        let summary = `**"${query}"에 대한 검색 결과:**\n\n`;

        sortedResults.forEach((result, index) => {
            const shortContent = this.extractKeyInfo(result.content, keywords, 150);
            summary += `**${index + 1}. ${result.source}**\n`;
            summary += `${shortContent}\n`;
            if (result.url) {
                summary += `🔗 [자세히 보기](${result.url})\n`;
            }
            summary += '\n';
        });

        // 관련 키워드 제안
        const relatedKeywords = this.generateRelatedKeywords(results, query);
        if (relatedKeywords.length > 0) {
            summary += `**관련 키워드:** ${relatedKeywords.join(', ')}\n\n`;
        }

        summary += `*총 ${results.length}개 소스에서 검색됨*`;

        return summary;
    }

    // 키워드 추출
    extractKeywords(text) {
        const stopWords = ['은', '는', '이', '가', '을', '를', '에', '에서', '와', '과', '의', '로', '으로', '에게', '한테', '부터', '까지', '처럼', '같이', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        
        return text.toLowerCase()
            .replace(/[^\w\s가-힣]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 1 && !stopWords.includes(word))
            .slice(0, 10);
    }

    // 관련성 점수 계산
    calculateRelevanceScore(content, keywords) {
        let score = 0;
        const lowerContent = content.toLowerCase();
        
        keywords.forEach(keyword => {
            const matches = (lowerContent.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
            score += matches * (keyword.length > 3 ? 2 : 1);
        });

        return score;
    }

    // 핵심 정보 추출
    extractKeyInfo(content, keywords, maxLength = 200) {
        const sentences = content.split(/[.!?。！？]/);
        let bestSentences = [];

        // 키워드가 포함된 문장들을 우선적으로 선택
        sentences.forEach(sentence => {
            const score = this.calculateRelevanceScore(sentence, keywords);
            if (score > 0) {
                bestSentences.push({ sentence: sentence.trim(), score });
            }
        });

        // 점수순으로 정렬
        bestSentences.sort((a, b) => b.score - a.score);

        // 최대 길이에 맞춰 문장들을 조합
        let result = '';
        for (const item of bestSentences) {
            if (result.length + item.sentence.length < maxLength) {
                result += (result ? ' ' : '') + item.sentence;
            } else {
                break;
            }
        }

        // 결과가 너무 짧으면 원본의 앞부분을 사용
        if (result.length < 50) {
            result = content.substring(0, maxLength);
        }

        return result.length > maxLength ? result.substring(0, maxLength) + '...' : result;
    }

    // 관련 키워드 생성
    generateRelatedKeywords(results, originalQuery) {
        const allText = results.map(r => r.content).join(' ');
        const keywords = this.extractKeywords(allText);
        const originalKeywords = this.extractKeywords(originalQuery);
        
        return keywords
            .filter(keyword => !originalKeywords.includes(keyword))
            .slice(0, 5);
    }

    // 검색 의도 분석
    analyzeSearchIntent(query) {
        const lowerQuery = query.toLowerCase();
        
        if (lowerQuery.includes('어떻게') || lowerQuery.includes('방법') || lowerQuery.includes('how')) {
            return 'how-to';
        }
        if (lowerQuery.includes('무엇') || lowerQuery.includes('뭐') || lowerQuery.includes('what')) {
            return 'definition';
        }
        if (lowerQuery.includes('왜') || lowerQuery.includes('이유') || lowerQuery.includes('why')) {
            return 'explanation';
        }
        if (lowerQuery.includes('언제') || lowerQuery.includes('when')) {
            return 'time';
        }
        if (lowerQuery.includes('어디') || lowerQuery.includes('where')) {
            return 'location';
        }
        
        return 'general';
    }
}

// 전역 검색 엔진 인스턴스
window.neroSearchEngine = new NeroSearchEngine();
