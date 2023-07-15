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

const BAOZIMH_URL = "https://cn.baozimh.com";

export const BaozimhInfo: SourceInfo = {
    version: "2.0",
    name: "包子漫画",
    icon: "icon.png",
    author: "hanqinilnix",
    description: "Extension that pulls 漫画 from 包子漫画",
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: BAOZIMH_URL,
    authorWebsite: "https://github.com/hanqinilnix",
    sourceTags: [
        {
            text: "Cloudflare",
            type: BadgeColor.RED,
        },
    ],
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS | SourceIntents.CLOUDFLARE_BYPASS_REQUIRED,
};

export class Baozimh implements ChapterProviding, HomePageSectionsProviding, MangaProviding, SearchResultsProviding {
    constructor(private cheerio: CheerioAPI) { }

    readonly requestManager: RequestManager = App.createRequestManager({
        requestsPerSecond: 3,
        requestTimeout: 15000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        referer: `${BAOZIMH_URL}/`,
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
                `CLOUDFLARE BYPASS ERROR:\nPlease go to the homepage of <${Baozimh.name}> and press the cloud icon.`
            );
        }
    }

    async getCloudflareBypassRequestAsync(): Promise<Request> {
        return App.createRequest({
            url: BAOZIMH_URL,
            method: "GET",
            headers: {
                referer: `${BAOZIMH_URL}/`,
                "user-agent": await this.requestManager.getDefaultUserAgent(),
            },
        });
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const request = App.createRequest({
            url: `${BAOZIMH_URL}/${mangaId}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        this.CloudFlareError(response.status);
        const $ = this.cheerio.load(response.data as string);

        const getChapterNumber = (link: string): number => {
            let chapterNumber = "";

            let i = link.length - 1;
            while (link[i] != "=") {
                chapterNumber = link[i] + chapterNumber;
                i--;
            }

            return +chapterNumber;
        };

        const sections = $(".l-box > .pure-g").toArray().length;
        let chapters;
        if (sections == 1) {
            const errorMessage = $('.tips-box-right').text().trim();
            throw Error(errorMessage);
        }
        else if (sections == 2) {
            chapters = $(".l-box > .pure-g > div > a").toArray(); // for manhua with less than certain number of chapters
        } else {
            chapters = $(".l-box > .pure-g[id^=chapter] > div > a").toArray();
        }

        chapters = chapters.map((element: CheerioElement): string[] => {
            // [link to chapter, name of chapter]
            return [$(element).attr("href")!.trim(), $(element).text().trim()];
        });

        return chapters.map((item: string[]) => {
            return App.createChapter({
                id: item[0] as string,
                chapNum: getChapterNumber(item[0] as string),
                name: item[1] as string,
                langCode: "zh",
            });
        });
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        let request = App.createRequest({
            url: `${BAOZIMH_URL}/${chapterId}`,
            method: "GET",
        });

        let response = await this.requestManager.schedule(request, 2);
        this.CloudFlareError(response.status);
        let $ = this.cheerio.load(response.data as string);

        let currentPageNumber = 1;
        let hasNextChapter = $(".next_chapter")
            .toArray()
            .map((nextChapter: CheerioElement): string =>
                $(nextChapter).text().trim())
            .filter((text: string): boolean => text == "点击进入下一页" || text == "點擊進入下一頁");

        while (hasNextChapter.length > 0) {
            // get next page
            request = App.createRequest({
                url: `${BAOZIMH_URL}/${chapterId}_${currentPageNumber}`,
                method: "GET",
            });

            response = await this.requestManager.schedule(request, 1);
            this.CloudFlareError(response.status);
            $ = this.cheerio.load(response.data as string);

            hasNextChapter = $(".next_chapter")
                .toArray()
                .map((nextChapter: CheerioElement): string =>
                    $(nextChapter).text().trim())
                .filter((text: string): boolean => text == "点击进入下一页" || text == "點擊進入下一頁");
        }

        // get the total number of pages of the chapter
        const numOfImages: number = +($(".comic-text__amp").last().text().trim().split("/")[0] as string);

        // get the first page url as sample for the rest of the chapter page
        const samplePageUrl = $(".comic-contain__item").first().attr("src")?.trim().split("/");

        const pages = [];

        for (let i = 1; i <= numOfImages; i++) {
            samplePageUrl?.pop();
            samplePageUrl?.push(String(i) + ".jpg?t=" + Math.floor(Math.random() * Math.pow(2, 16)));
            pages.push(samplePageUrl?.join("/"));
        }

        return App.createChapterDetails({
            id: chapterId,
            mangaId: mangaId,
            pages: pages as string[],
        });
    }

    async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const request = App.createRequest({
            url: `${BAOZIMH_URL}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        this.CloudFlareError(response.status);
        const $ = this.cheerio.load(response.data as string);

        const popularSection = App.createHomeSection({
            id: "0",
            title: "热门漫画",
            type: HomeSectionType.singleRowNormal,
            containsMoreItems: true,
        });
        sectionCallback(popularSection);
        popularSection.items = $(".index-rank > div > .comics-card")
            .toArray()
            .map((manga: CheerioElement): PartialSourceManga => App.createPartialSourceManga({
                mangaId: $(manga).find("a").attr("href")!.trim(),
                title: $(manga).find("a").attr("title")!.trim(),
                image: $(manga).find("amp-img").attr("src")!.trim(),
            }));
        sectionCallback(popularSection);

        const categories = $(".index-recommend-items").toArray();
        for (let id = 1; id < categories.length; id++) {
            let category = categories[id];
            let title = $(category).find(".catalog-title").text().trim();

            let section = App.createHomeSection({
                id: String(id),
                title: title,
                type: HomeSectionType.singleRowNormal,
                containsMoreItems: true,
            });
            sectionCallback(section);

            section.items = $(category)
                .find(".comics-card")
                .toArray()
                .map((manga: CheerioElement): PartialSourceManga => App.createPartialSourceManga({
                    mangaId: $(manga).find("a").attr("href")!.trim(),
                    title: $(manga).find("a").attr("title")!.trim(),
                    image: $(manga).find("amp-img").attr("src")!.trim(),
                }));
            sectionCallback(section);
        }
    }

    async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        throw new Error("Method not implemented.");
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const request = App.createRequest({
            url: `${BAOZIMH_URL}/${mangaId}`,
            method: "GET",
        });

        const response = await this.requestManager.schedule(request, 1);
        const $ = this.cheerio.load(response.data as string);

        const titles = [$("h1.comics-detail__title").text().trim()];
        const images = $("amp-img")
            .toArray()
            .map((element: CheerioElement): string => $(element).attr("src") as string);
        const author = $("h2.comics-detail__author").text().trim();
        const desc = $("p.comics-detail__desc").text().trim();
        const tags = $("span.tag")
            .toArray()
            .map((element: CheerioElement): string => $(element).text().trim());

        let status = "Unknown";
        switch (tags[0]) {
            case "连载中":
                status = "Ongoing";
                break;

            case "已完结":
                status = "Completed";
                break;

            default:
                status = "Unknown";
        }

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                image: images[0] as string,
                author: author,
                desc: desc,
                status: status,
                titles: titles,
                covers: [images[1] as string],
            })
        });
    }

    getMangaShareUrl?(mangaId: string): string {
        return `${BAOZIMH_URL}/${mangaId}`;
    }

    async getSearchResults(query: SearchRequest, metadata: unknown): Promise<PagedResults> {
        let request = App.createRequest({
            url: `${BAOZIMH_URL}/search?q=${encodeURIComponent(query.title as string)}`,
            method: "GET",
        });

        let response = await this.requestManager.schedule(request, 1);
        this.CloudFlareError(response.status);
        let $ = this.cheerio.load(response.data as string);

        const idLinks = $("div.comics-card > a.comics-card__info").toArray()
            .map((element: CheerioElement): string => $(element).attr("href")?.trim() as string);

        const titles = $(".comics-card__title").toArray()
            .map((element: CheerioElement): string => $(element).text().trim());

        const imageLinks = $("div.comics-card > a.comics-card__poster > amp-img").toArray()
            .map((element: CheerioElement): string => $(element).attr("src")?.trim() as string);

        if (idLinks.length == titles.length && titles.length == imageLinks.length) {
            let tiles: PartialSourceManga[] = [];
            for (let i = 0; i < idLinks.length; i++) {
                tiles.push(
                    App.createPartialSourceManga({
                        mangaId: idLinks[i] as string,
                        image: imageLinks[i] as string,
                        title: titles[i] as string,
                    })
                );
            }
            return App.createPagedResults({
                results: tiles,
                metadata: metadata,
            });
        }

        throw new Error("Something wrong has occured while searching!");
    }
}
