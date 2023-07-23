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
    version: "0.0.4",
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
        const request = App.createRequest({
            url: `${HAPPYMH_URL}/manga/${mangaId}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        this.CloudFlareError(response.status);
        const $ = this.cheerio.load(response.data as string);

        const mangaDetails = JSON.parse($('mip-data > script').eq(3).text().trim());
        type ChapterType = {
            id: string,
            chapterName: string,
            isNew: boolean
        }
        const chapters = mangaDetails['chapterList'].reverse();

        return chapters.map((chapter: ChapterType, index: number) => App.createChapter(
            {
                id: chapter['id'].trim(),
                chapNum: index,
                name: chapter['chapterName'].trim(),
            }
        ));
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = App.createRequest({
            url: `${HAPPYMH_URL}/v2.0/apis/manga/read?code=${mangaId}&cid=${chapterId}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        this.CloudFlareError(response.status);

        const chapterDetails = JSON.parse(response.data as string);
        const chapterData = chapterDetails["data"];
        const chapterPages = chapterData["scans"];
        type PageType = {
            url: string,
            r: number,
            n: number,
            width: number,
            height: number,
        }

        return App.createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: chapterPages.map((page: PageType): string => page['url']),
        });
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const request = App.createRequest({
            url: `${HAPPYMH_URL}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        this.CloudFlareError(response.status);
        const $ = this.cheerio.load(response.data as string);

        const getMangaID = function (link: string): string {
            return link.split('/').at(-1) as string;
        };

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
                mangaId: getMangaID($(manga).find('a').attr('href') as string),
                image: $(manga).find('mip-img').attr('src') as string,
                title: $(manga).find('.manga-title').text(),
                subtitle: $(manga).find('.manga-chapter').text(),
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
                mangaId: getMangaID($(manga).find('a').attr('href') as string),
                image: $(manga).find('mip-img').attr('src') as string,
                title: $(manga).find('.manga-title').text(),
                subtitle: $(manga).find('.manga-chapter').text(),
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
                mangaId: getMangaID($(manga).find('a').attr('href') as string),
                image: $(manga).find('mip-img').attr('src') as string,
                title: $(manga).find('.manga-title').text(),
                subtitle: $(manga).find('.manga-chapter').text(),
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
                mangaId: getMangaID($(manga).find('a').attr('href') as string),
                image: $(manga).find('mip-img').attr('src') as string,
                title: $(manga).find('.manga-title').text(),
                subtitle: $(manga).find('.manga-chapter').text(),
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
                mangaId: getMangaID($(manga).find('a').attr('href') as string),
                image: $(manga).find('mip-img').attr('src') as string,
                title: $(manga).find('.manga-title').text(),
                subtitle: $(manga).find('.manga-chapter').text(),
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
                mangaId: getMangaID($(manga).find('a').attr('href') as string),
                image: $(manga).find('mip-img').attr('src') as string,
                title: $(manga).find('.manga-title').text(),
                subtitle: $(manga).find('.manga-chapter').text(),
            })
        );
        sectionCallback(hotUpdateSection);
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        throw new Error("Method not implemented.");
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({
            url: `${HAPPYMH_URL}/manga/${mangaId}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        this.CloudFlareError(response.status);
        const $ = this.cheerio.load(response.data as string);

        const imageLink = $('div.mg-cover > mip-image').attr('src') as string;
        const description = $('mip-showmore#showmore').text().trim();
        const status = $('div.ongoing-status').text().trim();
        const title = $('h2.mg-title').text().trim();
        throw new Error(`imageLink: ${imageLink}\nDescription:${description}\nStatus:${status}\nTitle:${title}`);

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                image: imageLink,
                desc: description,
                status: status,
                titles: [title],
            }),
        });
    }

    getMangaShareUrl?(mangaId: string): string {
        return `${HAPPYMH_URL}/manga/${mangaId}`;
    }

    async getSearchResults(query: SearchRequest, metadata: unknown): Promise<PagedResults> {
        throw new Error("Method not implemented.");
    }
}
