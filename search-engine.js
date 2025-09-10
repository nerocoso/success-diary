// 네로봇 검색 엔진 - AI API 없이 무료 검색 및 요약 기능 (강화 버전)
class NeroSearchEngine {
    constructor() {
        this.corsProxies = [
            'https://api.allorigins.win/get?url=',
            'https://cors-anywhere.herokuapp.com/',
            'https://thingproxy.freeboard.io/fetch/',
            'https://proxy.cors.sh/',
            'https://corsproxy.io/?'
        ];
        this.currentProxyIndex = 0;
        this.cache = new Map(); // 검색 결과 캐싱
        this.cacheTimeout = 30 * 60 * 1000; // 30분 캐시
    }

    // 메인 검색 함수
    async search(query) {
        try {
            console.log(`네로봇이 "${query}"에 대해 검색 중...`);
            
            // 캐시 확인
            const cacheKey = query.toLowerCase().trim();
            const cached = this.getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            const results = await Promise.allSettled([
                this.searchWikipedia(query),
                this.searchDuckDuckGo(query),
                this.searchStackOverflow(query),
                this.searchReddit(query),
                this.searchGitHub(query),
                this.searchMDN(query),
                this.searchArxiv(query),
                this.searchHackerNews(query),
                this.searchQuora(query),
                this.searchMedium(query)
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
            const result = {
                success: true,
                summary: summary,
                sources: validResults.map(r => r.source),
                rawResults: validResults
            };

            // 결과 캐싱
            this.saveToCache(cacheKey, result);
            return result;

        } catch (error) {
            console.error('검색 오류:', error);
            return {
                success: false,
                message: '검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
            };
        }
    }

    // 캐시 관리 함수들
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            console.log('캐시에서 결과 반환:', key);
            return cached.data;
        }
        return null;
    }

    saveToCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        // 캐시 크기 제한 (최대 100개)
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    // Reddit 검색
    async searchReddit(query) {
        try {
            const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=5&sort=relevance`;
            const response = await this.fetchWithProxy(searchUrl);
            
            if (response.data && response.data.children && response.data.children.length > 0) {
                const posts = response.data.children.slice(0, 3);
                const content = posts.map(post => {
                    const data = post.data;
                    return `${data.title}: ${data.selftext || '링크 게시물'}`.substring(0, 200);
                }).join('\n');

                return {
                    source: 'Reddit',
                    title: `Reddit 토론: ${query}`,
                    content: content,
                    url: `https://www.reddit.com/search?q=${encodeURIComponent(query)}`,
                    type: 'community'
                };
            }
            return null;
        } catch (error) {
            console.log('Reddit 검색 실패:', error.message);
            return null;
        }
    }

    // GitHub 검색
    async searchGitHub(query) {
        try {
            const programmingKeywords = ['javascript', 'python', 'java', 'css', 'html', 'react', 'node', 'api', 'github', 'git', '코딩', '프로그래밍', '개발'];
            const isProgrammingQuery = programmingKeywords.some(keyword => 
                query.toLowerCase().includes(keyword)
            );

            if (!isProgrammingQuery) return null;

            const searchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=3`;
            const response = await fetch(searchUrl);
            const data = await response.json();

            if (data.items && data.items.length > 0) {
                const repos = data.items.slice(0, 3);
                const content = repos.map(repo => 
                    `${repo.full_name} (⭐${repo.stargazers_count}): ${repo.description || '설명 없음'}`
                ).join('\n');

                return {
                    source: 'GitHub',
                    title: `GitHub 저장소: ${query}`,
                    content: content,
                    url: `https://github.com/search?q=${encodeURIComponent(query)}`,
                    type: 'programming'
                };
            }
            return null;
        } catch (error) {
            console.log('GitHub 검색 실패:', error.message);
            return null;
        }
    }

    // MDN 검색 (웹 개발 관련)
    async searchMDN(query) {
        try {
            const webKeywords = ['javascript', 'css', 'html', 'web', 'dom', 'api', 'browser', 'function', 'method'];
            const isWebQuery = webKeywords.some(keyword => 
                query.toLowerCase().includes(keyword)
            );

            if (!isWebQuery) return null;

            // MDN의 검색 API는 제한적이므로 직접 페이지 접근 시도
            const searchTerm = query.toLowerCase().replace(/\s+/g, '_');
            const mdnUrl = `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/${searchTerm}`;
            
            try {
                const response = await this.fetchWithProxy(mdnUrl);
                if (response && typeof response === 'string' && response.includes('summary')) {
                    return {
                        source: 'MDN Web Docs',
                        title: `${query} - MDN`,
                        content: `MDN Web Docs에서 ${query}에 대한 공식 문서를 찾았습니다. 웹 표준 기술에 대한 상세한 설명이 포함되어 있습니다.`,
                        url: mdnUrl,
                        type: 'documentation'
                    };
                }
            } catch {}
            return null;
        } catch (error) {
            console.log('MDN 검색 실패:', error.message);
            return null;
        }
    }

    // arXiv 검색 (학술 논문)
    async searchArxiv(query) {
        try {
            const academicKeywords = ['machine learning', 'ai', 'artificial intelligence', 'deep learning', 'neural network', 'algorithm', 'research', '머신러닝', '인공지능', '딥러닝', '알고리즘', '연구'];
            const isAcademicQuery = academicKeywords.some(keyword => 
                query.toLowerCase().includes(keyword)
            );

            if (!isAcademicQuery) return null;

            const searchUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=3`;
            const response = await this.fetchWithProxy(searchUrl);
            
            if (typeof response === 'string' && response.includes('<entry>')) {
                const titles = response.match(/<title[^>]*>([^<]+)<\/title>/g);
                if (titles && titles.length > 1) {
                    const paperTitles = titles.slice(1, 4).map(title => 
                        title.replace(/<[^>]*>/g, '').trim()
                    );
                    
                    return {
                        source: 'arXiv',
                        title: `학술 논문: ${query}`,
                        content: `관련 논문들:\n${paperTitles.join('\n')}`,
                        url: `https://arxiv.org/search/?query=${encodeURIComponent(query)}`,
                        type: 'academic'
                    };
                }
            }
            return null;
        } catch (error) {
            console.log('arXiv 검색 실패:', error.message);
            return null;
        }
    }

    // Hacker News 검색
    async searchHackerNews(query) {
        try {
            const techKeywords = ['startup', 'tech', 'programming', 'software', 'developer', 'coding', 'technology', '스타트업', '기술', '개발'];
            const isTechQuery = techKeywords.some(keyword => 
                query.toLowerCase().includes(keyword)
            );

            if (!isTechQuery) return null;

            const searchUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=3`;
            const response = await this.fetchWithProxy(searchUrl);
            
            if (response.hits && response.hits.length > 0) {
                const stories = response.hits.slice(0, 3);
                const content = stories.map(story => 
                    `${story.title} (${story.points || 0}점, ${story.num_comments || 0}댓글)`
                ).join('\n');

                return {
                    source: 'Hacker News',
                    title: `기술 뉴스: ${query}`,
                    content: content,
                    url: `https://hn.algolia.com/?query=${encodeURIComponent(query)}`,
                    type: 'tech_news'
                };
            }
            return null;
        } catch (error) {
            console.log('Hacker News 검색 실패:', error.message);
            return null;
        }
    }

    // Quora 검색
    async searchQuora(query) {
        try {
            // Quora는 API 제한이 많아서 간단한 검색만 시도
            const searchUrl = `https://www.quora.com/search?q=${encodeURIComponent(query)}`;
            
            return {
                source: 'Quora',
                title: `Quora Q&A: ${query}`,
                content: `Quora에서 "${query}"와 관련된 질문과 답변을 찾을 수 있습니다. 전문가들의 실제 경험과 조언이 포함되어 있습니다.`,
                url: searchUrl,
                type: 'qa'
            };
        } catch (error) {
            console.log('Quora 검색 실패:', error.message);
            return null;
        }
    }

    // Medium 검색
    async searchMedium(query) {
        try {
            const searchUrl = `https://medium.com/search?q=${encodeURIComponent(query)}`;
            
            return {
                source: 'Medium',
                title: `Medium 아티클: ${query}`,
                content: `Medium에서 "${query}"에 대한 전문가 아티클과 튜토리얼을 찾을 수 있습니다. 실무 경험과 인사이트가 풍부한 콘텐츠입니다.`,
                url: searchUrl,
                type: 'blog'
            };
        } catch (error) {
            console.log('Medium 검색 실패:', error.message);
            return null;
        }
    }

    // Wikipedia 검색 (다국어 지원 강화)
    async searchWikipedia(query) {
        try {
            // 한국어 우선, 실패시 영어로 재시도
            let searchUrl = `https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
            let response = await this.fetchWithProxy(searchUrl);
            
            if (!response || response.type === 'disambiguation' || !response.extract) {
                // 영어 Wikipedia로 재시도
                searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
                response = await this.fetchWithProxy(searchUrl);
            }
            
            if (response.type === 'disambiguation') {
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

    // 검색 결과 요약 (AI API 없이) - 강화 버전
    summarizeResults(results, query) {
        if (results.length === 0) {
            return `"${query}"에 대한 정보를 찾을 수 없습니다.`;
        }

        // 키워드 추출
        const keywords = this.extractKeywords(query);
        
        // 결과들을 타입별로 그룹화하고 중요도별로 정렬
        const groupedResults = this.groupResultsByType(results);
        const sortedResults = results.sort((a, b) => {
            const scoreA = this.calculateRelevanceScore(a.content, keywords);
            const scoreB = this.calculateRelevanceScore(b.content, keywords);
            return scoreB - scoreA;
        });

        // 종합 요약 생성
        let summary = `🔍 **"${query}"에 대한 종합 검색 결과**\n\n`;

        // 핵심 정보 요약 (상위 3개 결과 기반)
        const topResults = sortedResults.slice(0, 3);
        const keyInfo = this.generateKeyInsights(topResults, keywords, query);
        if (keyInfo) {
            summary += `📋 **핵심 정보**\n${keyInfo}\n\n`;
        }

        // 소스별 상세 정보
        summary += `📚 **상세 정보 (${results.length}개 소스)**\n\n`;
        
        sortedResults.forEach((result, index) => {
            const shortContent = this.extractKeyInfo(result.content, keywords, 120);
            const typeEmoji = this.getTypeEmoji(result.type);
            summary += `${typeEmoji} **${result.source}**\n`;
            summary += `${shortContent}\n`;
            if (result.url) {
                summary += `🔗 [자세히 보기](${result.url})\n`;
            }
            summary += '\n';
        });

        // 관련 키워드 및 추천 검색어
        const relatedKeywords = this.generateRelatedKeywords(results, query);
        if (relatedKeywords.length > 0) {
            summary += `🏷️ **관련 키워드:** ${relatedKeywords.join(', ')}\n\n`;
        }

        // 검색 통계
        const sourceTypes = [...new Set(results.map(r => r.type))];
        summary += `📊 **검색 범위:** ${sourceTypes.join(', ')} | **총 ${results.length}개 소스**`;

        return summary;
    }

    // 결과 타입별 그룹화
    groupResultsByType(results) {
        const groups = {};
        results.forEach(result => {
            const type = result.type || 'general';
            if (!groups[type]) groups[type] = [];
            groups[type].push(result);
        });
        return groups;
    }

    // 핵심 인사이트 생성
    generateKeyInsights(topResults, keywords, query) {
        if (topResults.length === 0) return '';

        const insights = [];
        
        // 정의나 설명 찾기
        const definitionResult = topResults.find(r => 
            r.type === 'encyclopedia' || r.source === 'Wikipedia'
        );
        if (definitionResult) {
            const def = this.extractKeyInfo(definitionResult.content, keywords, 100);
            insights.push(`• **정의**: ${def}`);
        }

        // 실용적 정보 찾기
        const practicalResult = topResults.find(r => 
            r.type === 'programming' || r.type === 'documentation' || r.source === 'GitHub'
        );
        if (practicalResult && practicalResult !== definitionResult) {
            const practical = this.extractKeyInfo(practicalResult.content, keywords, 100);
            insights.push(`• **실용 정보**: ${practical}`);
        }

        // 커뮤니티 관점 찾기
        const communityResult = topResults.find(r => 
            r.type === 'community' || r.type === 'qa' || r.source === 'Reddit'
        );
        if (communityResult && !insights.some(i => i.includes(communityResult.source))) {
            const community = this.extractKeyInfo(communityResult.content, keywords, 100);
            insights.push(`• **커뮤니티 관점**: ${community}`);
        }

        return insights.join('\n');
    }

    // 타입별 이모지 반환
    getTypeEmoji(type) {
        const emojiMap = {
            'encyclopedia': '📖',
            'general': '🌐',
            'programming': '💻',
            'documentation': '📋',
            'academic': '🎓',
            'community': '👥',
            'tech_news': '📰',
            'qa': '❓',
            'blog': '✍️'
        };
        return emojiMap[type] || '📄';
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
