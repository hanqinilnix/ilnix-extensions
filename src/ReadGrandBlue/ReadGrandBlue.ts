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
    Request,
    RequestManager,
    Response,
    SourceInfo,
    SourceIntents,
    SourceManga,
} from "@paperback/types";

const GRANDBLUE_URL = "https://grandbluedreaming.online/";

export const ReadGrandBlueInfo: SourceInfo = {
    version: "1.0.2",
    name: "ReadGrandBlue",
    icon: "icon.png",
    author: "hanqinilnix",
    description: "Paperback Extension for Grand Blue",
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: GRANDBLUE_URL,
    authorWebsite: "https://github.com/hanqinilnix",
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS,
};

export class ReadGrandBlue implements ChapterProviding, MangaProviding, HomePageSectionsProviding {
    constructor(private cheerio: CheerioAPI) { }

    readonly requestManager: RequestManager = App.createRequestManager({
        requestsPerSecond: 2,
        requestTimeout: 10000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
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
            url: `${GRANDBLUE_URL}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data as string);

        const chapterHtml =  $('div#Chapters_List > ul > li > ul > li').toArray().reverse();
        let chapters: Chapter[] = [];
        for (let i = 0; i < chapterHtml.length; i++) {
            chapters.push(App.createChapter({
                id: $(chapterHtml[i]).find('a').attr('href')!.trim(),
                chapNum: i,
                name: $(chapterHtml[i]).text().trim(),
                langCode: 'en',
            }))
        }

        return chapters;
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = App.createRequest({
            url: `${chapterId}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 2);
        const $ = this.cheerio.load(response.data as string);

        const images = $('p > img').toArray()
            .map((img: CheerioElement): string => $(img).attr('src')!);

        return App.createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: images
        });
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const request = App.createRequest({
            url: `${GRANDBLUE_URL}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data as string);

        const HomepageSection = App.createHomeSection({
            id: 'normal',
            title: '',
            type: HomeSectionType.singleRowNormal,
            containsMoreItems: false,
        });
        sectionCallback(HomepageSection);
        HomepageSection.items = [App.createPartialSourceManga({
                mangaId: `${GRANDBLUE_URL}`,
                title: $('.entry-title').text().trim(),
                image: $('img').attr('src')!.trim()
            })];
        sectionCallback(HomepageSection);
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        throw new Error("Method not implemented.");
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({
            url: `${GRANDBLUE_URL}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data as string);

        const titles: string[] = ["Grand Blue"];

        const status = "Ongoing";

        const image = $('img').attr('src')!.trim();

        const description = $('p').toArray()
            .map(list => $(list).html())
                .slice(1, 3)
                .join('\n');

        return App.createSourceManga({
            id: `${GRANDBLUE_URL}`,
            mangaInfo: App.createMangaInfo({
                image: image,
                desc: description,
                status: status,
                titles: titles,
            })
        });
    }

    getMangaShareUrl?(mangaId: string): string {
        return `${GRANDBLUE_URL}`;
    }

}
