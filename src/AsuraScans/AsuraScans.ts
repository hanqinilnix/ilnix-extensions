import {
    Chapter,
    ChapterDetails,
    ChapterProviding,
    ContentRating,
    HomePageSectionsProviding,
    HomeSection,
    HomeSectionType,
    MangaProviding,
    PagedResults,
    PartialSourceManga,
    Request,
    RequestManager,
    Response,
    SearchRequest,
    SearchResultsProviding,
    SourceInfo,
    SourceIntents,
    SourceManga,
} from "@paperback/types";

import entities = require('entities');

const ASURA_URL = "https://asura.gg/";

export const AsuraScansInfo: SourceInfo = {
    version: "2.0.2",
    name: "AsuraScans",
    icon: "icon.png",
    author: "hanqinilnix",
    description: "Paperback Extension for AsuraScans",
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: ASURA_URL,
    authorWebsite: "https://github.com/hanqinilnix",
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS,
};

export class AsuraScans implements ChapterProviding, HomePageSectionsProviding, MangaProviding, SearchResultsProviding {
    constructor(private cheerio: CheerioAPI) { }

    private decodeHTMLEntity(str: string): string {
        return entities.decodeHTML(str);
    }

    readonly requestManager: RequestManager = App.createRequestManager({
        requestsPerSecond: 3,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        referer: `${ASURA_URL}/`,
                        "user-agent": await this.requestManager.getDefaultUserAgent(),
                    },
                };
                return request;
            },
            interceptResponse: async (response: Response): Promise<Response> => {
                return response;
            }
        }
    });

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = App.createRequest({
            url: `${mangaId}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data as string);

        const getChapterNumber = function (chapterNumber: string): number {
            return +(chapterNumber.split(' ')[0]! as string);
        };

        return $('div#chapterlist > ul > li').toArray()
            .map((chapter: CheerioElement): Chapter => App.createChapter({
                id: $(chapter).find('a').attr('href')!.trim(),
                chapNum: getChapterNumber($(chapter).attr('data-num')!.trim()),
                name: $(chapter).find('.chapternum').text().trim(),
                time: new Date($(chapter).find('.chapterdate').text().trim()),
                langCode: 'en',
            }));
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = App.createRequest({
            url: `${chapterId}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 2);
        const $ = this.cheerio.load(response.data as string);

        const images = $('img').toArray()
            .map((img: CheerioElement): string => $(img).attr('src')!)
            .slice(1, -8);

        return App.createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: images
        });
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const request = App.createRequest({
            url: `${ASURA_URL}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data as string);

        const featuredSection = App.createHomeSection({
            id: 'featured',
            title: 'Featured',
            type: HomeSectionType.featured,
            containsMoreItems: true,
        });
        sectionCallback(featuredSection);
        featuredSection.items = $('.slide-item').toArray()
            .map((manga: CheerioElement): PartialSourceManga => App.createPartialSourceManga({
                mangaId: $(manga).find('a').attr('href')!.trim(),
                title: this.decodeHTMLEntity($(manga).find('.ellipsis').text().trim()),
                image: $(manga).find('img').attr('src')!.trim()
            }));
        sectionCallback(featuredSection);

        // Popular Today
        const popularTodaySection = App.createHomeSection({
            id: 'popular_today',
            title: 'Popular Today',
            type: HomeSectionType.singleRowNormal,
            containsMoreItems: true,
        });
        sectionCallback(popularTodaySection);
        popularTodaySection.items = $('.bixbox > div > div.bs').toArray()
            .map((manga: CheerioElement): PartialSourceManga => App.createPartialSourceManga({
                mangaId: $(manga).find('a').attr('href')!.trim(),
                title: this.decodeHTMLEntity($(manga).find('a').attr('title')!.trim()),
                image: $(manga).find('img').attr('src')!.trim()
            }));
        sectionCallback(popularTodaySection);

        // Popular Weekly
        const popWeeklySection = App.createHomeSection({
            id: 'popular_weekly',
            title: 'Weekly Popular',
            type: HomeSectionType.singleRowNormal,
            containsMoreItems: true,
        });
        sectionCallback(popWeeklySection);
        popWeeklySection.items = $('.wpop-weekly > ul > li').toArray()
            .map((manga: CheerioElement): PartialSourceManga => App.createPartialSourceManga({
                mangaId: $(manga).find('a').attr('href')!.trim(),
                title: this.decodeHTMLEntity($(manga).find('h2').text().trim()),
                image: $(manga).find('img').attr('src')!.trim()
            }));
        sectionCallback(popWeeklySection);

        // Popular Monthly
        const popMonthlySection = App.createHomeSection({
            id: 'popular_monthly',
            title: 'Monthly Popular',
            type: HomeSectionType.singleRowNormal,
            containsMoreItems: true,
        });
        sectionCallback(popMonthlySection);
        popMonthlySection.items = $('.wpop-monthly > ul > li').toArray()
            .map((manga: CheerioElement): PartialSourceManga => App.createPartialSourceManga({
                mangaId: $(manga).find('a').attr('href')!.trim(),
                title: this.decodeHTMLEntity($(manga).find('h2').text().trim()),
                image: $(manga).find('img').attr('src')!.trim()
            }));
        sectionCallback(popMonthlySection);

        // Popular All Time
        const popAllTimeSection = App.createHomeSection({
            id: 'popular_all_time',
            title: 'All Time Popular',
            type: HomeSectionType.singleRowNormal,
            containsMoreItems: true,
        });
        sectionCallback(popAllTimeSection);
        popAllTimeSection.items = $('.wpop-alltime > ul > li').toArray()
            .map((manga: CheerioElement): PartialSourceManga => App.createPartialSourceManga({
                mangaId: $(manga).find('a').attr('href')!.trim(),
                title: this.decodeHTMLEntity($(manga).find('h2').text().trim()),
                image: $(manga).find('img').attr('src')!.trim()
            }));
        sectionCallback(popAllTimeSection);

        // Latest Update
        const lastestUpdateSection = App.createHomeSection({
            id: 'latest_update',
            title: 'Latest Update',
            type: HomeSectionType.singleRowNormal,
            containsMoreItems: true,
        });
        sectionCallback(lastestUpdateSection);
        lastestUpdateSection.items = $('.bixbox > div > div.utao').toArray()
            .map((manga: CheerioElement): PartialSourceManga => App.createPartialSourceManga({
                mangaId: $(manga).find('a').attr('href')!.trim(),
                title: this.decodeHTMLEntity($(manga).find('a').attr('title')!.trim()),
                image: $(manga).find('img').attr('src')!.trim()
            }));
        sectionCallback(lastestUpdateSection);
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        throw new Error("Method not implemented.");
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({
            url: `${mangaId}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data as string);

        const titles: string[] = [];
        titles.push(this.decodeHTMLEntity($('.entry-title').text()));

        const status = $('.imptdt > i').text();

        const image = $('.thumb > img').attr('src')!.trim();

        const rating = $('.num').text().trim();

        const details = $('.fmed > span').toArray()
            .map((detail: CheerioElement): string => $(detail).text().trim());

        const description = $('p').toArray()
            .map((desc: CheerioElement): string => $(desc).text().trim())
            .slice(0, -1)
            .join('\n');

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                image: image,
                artist: details[1],
                author: details[2],
                desc: this.decodeHTMLEntity(description),
                status: status,
                titles: titles,
                rating: +rating,
            })
        });
    }

    getMangaShareUrl?(mangaId: string): string {
        return mangaId;
    }

    async getSearchResults(query: SearchRequest, metadata: unknown): Promise<PagedResults> {
        const request = App.createRequest({
            url: `${ASURA_URL}?s=${encodeURIComponent(query.title as string)}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data as string);

        const pageResults = $('.bs').toArray()
            .map((result: CheerioElement): PartialSourceManga => App.createPartialSourceManga({
                mangaId: $(result).find('a').attr('href')!.trim(),
                title: $(result).find('a').attr('title')!.trim(),
                image: $(result).find('img').attr('src')!.trim()
            }));

        return App.createPagedResults({
            results: pageResults,
            metadata: metadata,
        });
    }
}
