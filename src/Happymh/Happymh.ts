import {
    BadgeColor,
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

const HAPPYMH_URL = "https://m.happymh.com";

export const HappymhInfo: SourceInfo = {
    version: "0.0.3",
    name: "嗨皮漫画",
    icon: "icon.png",
    author: "hanqinilnix",
    description: "Paperback Extension for 嗨皮漫画",
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: HAPPYMH_URL,
    authorWebsite: "https://github.com/hanqinilnix",
    sourceTags: [
        {
            text: "Cloudflare",
            type: BadgeColor.RED,
        },
    ],
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
};

export class Happymh implements ChapterProviding, HomePageSectionsProviding, MangaProviding, SearchResultsProviding {
    constructor(private cheerio: CheerioAPI) { }

    readonly requestManager: RequestManager = App.createRequestManager({
        requestsPerSecond: 3,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        referer: `${HAPPYMH_URL}/`,
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


    CloudFlareError(status: number): void {
        if (status == 503 || status == 403) {
            throw new Error(
                `CLOUDFLARE BYPASS ERROR:\nPlease go to the homepage of <${Happymh.name}> and press the cloud icon.`
            );
        }
    }

    async getCloudflareBypassRequestAsync(): Promise<Request> {
        return App.createRequest({
            url: HAPPYMH_URL,
            method: "GET",
            headers: {
                referer: `${HAPPYMH_URL}/`,
                "user-agent": await this.requestManager.getDefaultUserAgent(),
            },
        });
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        throw new Error("Method not implemented.");
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        throw new Error("Method not implemented.");
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const request = App.createRequest({
            url: `${HAPPYMH_URL}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        this.CloudFlareError(response.status);
        const $ = this.cheerio.load(response.data as string);

        const testSection = App.createHomeSection({
            id: "0",
            title: "Test",
            type: HomeSectionType.singleRowNormal,
            containsMoreItems: true,
        });
        sectionCallback(testSection);
        testSection.items = [App.createPartialSourceManga(
            {
                mangaId: 'https://m.happymh.com/manga/wodemeimeilaizilinguo',
                image: 'https://rr.happymh.com/mcover/5a3976e55a0e0088225d5ea67dfe8860.jpg',
                title: '我的妹妹来自邻国',
                subtitle: '更新至：第26话 找个猪头当男友',
            }
        )]
        sectionCallback(testSection);

        const dailySectionElement = $('div.manga-area').eq(0);
        const dailyTitle = $(dailySectionElement).find('h3').text();
        const dailySection = App.createHomeSection({
            id: "1",
            title: dailyTitle,
            type: HomeSectionType.singleRowNormal,
            containsMoreItems: false,
        });
        sectionCallback(dailySection);
        const dailySectionItems = $(dailySectionElement).find('div.manga-cover').toArray();
        dailySection.items = dailySectionItems.map(
            (manga: CheerioElement): PartialSourceManga => App.createPartialSourceManga({
                mangaId: $(manga).find('a').attr('href') as string,
                image: $(manga).find('mip-img').attr('src') as string,
                title: $(manga).find('.manga-title').text(),
            })
        )
        sectionCallback(dailySection);
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        throw new Error("Method not implemented.");
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        throw new Error("Method not implemented.");
    }

    getMangaShareUrl?(mangaId: string): string {
        throw new Error("Method not implemented.");
    }

    async getSearchResults(query: SearchRequest, metadata: unknown): Promise<PagedResults> {
        throw new Error("Method not implemented.");
    }
}
