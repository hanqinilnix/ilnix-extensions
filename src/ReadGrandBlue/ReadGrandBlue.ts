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

const GRANDBLUE_URL = "https://grandbluemanga.xyz/";

export const ReadGrandBlueInfo: SourceInfo = {
    version: "2.0.0",
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

        const chapterRow =  $('ul.main > li').toArray();
        let chapters: Chapter[] = [];

        // Constants for slicing name
        const grandblue = 'Grand Blue, ';
        const read = 'Read';

        for (let i = 0; i < chapterRow.length; i++) {
            let chapterName = $(chapterRow[i]).text().replace(/\s+/g, ' ').trim();
            chapters.push(App.createChapter({
                id: $(chapterRow[i]).find('a').attr('href')!.trim(),
                chapNum: i,
                name: chapterName.substring(grandblue.length, chapterName.length - read.length),
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

        const images = $('.page-break > img').toArray()
            .map((img: CheerioElement): string => $(img).attr('src')!.trim());

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
                title: 'Grand Blue Dreaming',
                image: $('.summary_image > img').attr('src')!.trim()
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

        const author = $('.author-content').text().trim();

        const artist = $('.artist-content').text().trim();

        const titles: string[] = ["Grand Blue"];

        const status = "Ongoing";

        const image = $('.summary_image > img').attr('src')!.trim();

        const description = $('.description-summary').text().trim();

        return App.createSourceManga({
            id: `${GRANDBLUE_URL}`,
            mangaInfo: App.createMangaInfo({
                image: image,
                author: author,
                artist: artist,
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
