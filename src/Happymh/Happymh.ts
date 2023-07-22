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

        const dailySectionElement = $('div.manga-area').eq(0);
        const dailyTitle = $(dailySectionElement).find('h3').text();
        const dailySection = App.createHomeSection({
            id: "daily",
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
        );
        sectionCallback(dailySection);

        const hotSectionElement = $('div.manga-area').eq(1);
        const hotTitle = $(hotSectionElement).find('h3').text();
        const hotSection = App.createHomeSection({
            id: "hot",
            title: hotTitle,
            type: HomeSectionType.singleRowNormal,
            containsMoreItems: false,
        });
        sectionCallback(hotSection);
        const hotSectionItems = $(hotSectionElement).find('div.manga-cover').toArray();
        hotSection.items = hotSectionItems.map(
            (manga: CheerioElement): PartialSourceManga => App.createPartialSourceManga({
                mangaId: $(manga).find('a').attr('href') as string,
                image: $(manga).find('mip-img').attr('src') as string,
                title: $(manga).find('.manga-title').text(),
            })
        );
        sectionCallback(hotSection);
        
        const shaonianSectionElement = $('div.manga-area').eq(2);
        const shaonianTitle = $(shaonianSectionElement).find('h3').text();
        const shaonianSection = App.createHomeSection({
            id: "shaonian",
            title: shaonianTitle,
            type: HomeSectionType.singleRowNormal,
            containsMoreItems: false,
        });
        sectionCallback(shaonianSection);
        const shaonianSectionItems = $(shaonianSectionElement).find('div.manga-cover').toArray();
        shaonianSection.items = shaonianSectionItems.map(
            (manga: CheerioElement): PartialSourceManga => App.createPartialSourceManga({
                mangaId: $(manga).find('a').attr('href') as string,
                image: $(manga).find('mip-img').attr('src') as string,
                title: $(manga).find('.manga-title').text(),
            })
        );
        sectionCallback(shaonianSection);
        
        const shaonvSectionElement = $('div.manga-area').eq(3);
        const shaonvTitle = $(shaonvSectionElement).find('h3').text();
        const shaonvSection = App.createHomeSection({
            id: "shaonv",
            title: shaonvTitle,
            type: HomeSectionType.singleRowNormal,
            containsMoreItems: false,
        });
        sectionCallback(shaonvSection);
        const shaonvSectionItems = $(shaonvSectionElement).find('div.manga-cover').toArray();
        shaonvSection.items = shaonvSectionItems.map(
            (manga: CheerioElement): PartialSourceManga => App.createPartialSourceManga({
                mangaId: $(manga).find('a').attr('href') as string,
                image: $(manga).find('mip-img').attr('src') as string,
                title: $(manga).find('.manga-title').text(),
            })
        );
        sectionCallback(shaonvSection);

        const blSectionElement = $('div.manga-area').eq(4);
        const blTitle = $(blSectionElement).find('h3').text();
        const blSection = App.createHomeSection({
            id: "bl",
            title: blTitle,
            type: HomeSectionType.singleRowNormal,
            containsMoreItems: false,
        });
        sectionCallback(blSection);
        const blSectionItems = $(blSectionElement).find('div.manga-cover').toArray();
        blSection.items = blSectionItems.map(
            (manga: CheerioElement): PartialSourceManga => App.createPartialSourceManga({
                mangaId: $(manga).find('a').attr('href') as string,
                image: $(manga).find('mip-img').attr('src') as string,
                title: $(manga).find('.manga-title').text(),
            })
        );
        sectionCallback(blSection);

        const hotUpdateSectionElement = $('div.manga-area').eq(5);
        const hotUpdateTitle = $(hotUpdateSectionElement).find('h3').text();
        const hotUpdateSection = App.createHomeSection({
            id: "hotUpdate",
            title: hotUpdateTitle,
            type: HomeSectionType.singleRowNormal,
            containsMoreItems: false,
        });
        sectionCallback(hotUpdateSection);
        const hotUpdateSectionItems = $(hotUpdateSectionElement).find('div.manga-cover').toArray();
        hotUpdateSection.items = hotUpdateSectionItems.map(
            (manga: CheerioElement): PartialSourceManga => App.createPartialSourceManga({
                mangaId: $(manga).find('a').attr('href') as string,
                image: $(manga).find('mip-img').attr('src') as string,
                title: $(manga).find('.manga-title').text(),
            })
        );
        sectionCallback(hotUpdateSection);
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
