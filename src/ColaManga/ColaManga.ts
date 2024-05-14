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

const COLAMANGA_URL = "https://www.colamanga.com/";

export const ColaMangaInfo: SourceInfo = {
    version: "0.0.1",
    name: "COLAMANGA",
    icon: "icon.png",
    author: "hanqinilnix",
    description: "Paperback Extension for COLAMANGA",
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: COLAMANGA_URL,
    authorWebsite: "https://github.com/hanqinilnix",
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS,
};

export class ColaManga implements ChapterProviding, HomePageSectionsProviding, MangaProviding, SearchResultsProviding {
    constructor(private cheerio: CheerioAPI) { }

    readonly requestManager: RequestManager = App.createRequestManager({
        requestsPerSecond: 3,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        referer: `${COLAMANGA_URL}/`,
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
                `CLOUDFLARE BYPASS ERROR:\nPlease go to the homepage of <${ColaMangaInfo.name}> and press the cloud icon.`
            );
        }
    }

    async getCloudflareBypassRequestAsync(): Promise<Request> {
        return App.createRequest({
            url: `${COLAMANGA_URL}/`,
            method: "GET",
            headers: {
                referer: `${COLAMANGA_URL}/`,
                "user-agent": await this.requestManager.getDefaultUserAgent(),
            },
        });
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        throw new Error("Not implemented");
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        throw new Error("Not implemented");
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const request = App.createRequest({
            url: `https://img.colamanga.com/comic/12202/aHBacXVLbWp3SVlQSjgwVE9BUS9hNjJTeGtrZzAyTE1TS0ZlSG85VW5PMWZkT0tUSFdZUE1kSi82eXdLSWRBakZOdUQyd1pldisrY3BnSGJGVVQ2d1E9PQ==/0001.enc.webp`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        this.CloudFlareError(response.status);
        throw new Error(response.data);
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        throw new Error("Method not implemented.");
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        throw new Error("Method not implemented.");
    }

    getMangaShareUrl?(mangaId: string): string {
        return `${COLAMANGA_URL}/${mangaId}`;
    }

    async getSearchResults(query: SearchRequest, metadata: unknown): Promise<PagedResults> {
        throw new Error("Method not implemented.");
    }
}
