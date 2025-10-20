import User from "../users/model.js";
import Feed from "../feed/model.js";
import { MarketPlace } from "../market-place/model.js";
import { Videos } from "../videos/model.js";
import { FRIEND_REQUEST_STATUS, CATEGORY_TYPE } from "../../constants/enums.js";
import FriendRequests from "../friend-requests/model.js";

const sanitizeQuery = (query) => {
  if (!query || typeof query !== "string") return "";

  const trimmed = query.trim();
  if (trimmed.length < 2) return "";

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return escaped;
};

export class GlobalSearchService {
  constructor() {
    this.searchTypes = {
      ALL: "all",
      USERS: "users",
      FEED: "feed",
      MARKETPLACE: "marketplace",
      VIDEOS: "videos",
    };

    this.resultCategories = {
      USERS: "users",
      POSTS: "posts",
      PRODUCTS: "products",
      VIDEOS: "videos",
    };

    this.categoryLabels = Object.keys(CATEGORY_TYPE).reduce((acc, label) => {
      acc[CATEGORY_TYPE[label]] = label;
      return acc;
    }, {});
  }

  async globalSearch({
    query,
    currentUserId,
    searchType = "all",
    page = 1,
    limit = 20,
    sortBy = "relevance",
    filters = {},
  }) {
    try {
      const results = {
        query,
        searchType,
        categories: {},
        totalResults: 0,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: false,
        },
      };

      if (searchType === this.searchTypes.ALL) {
        const [users, feed, marketplace, videos] = await Promise.all([
          this.searchUsers({
            query,
            currentUserId,
            limit: Math.ceil(limit / 5),
          }),
          this.searchFeed({
            query,
            currentUserId,
            limit: Math.ceil(limit / 5),
          }),
          this.searchMarketplace({
            query,
            currentUserId,
            limit: Math.ceil(limit / 5),
          }),
          this.searchVideos({
            query,
            currentUserId,
            limit: Math.ceil(limit / 5),
          }),
        ]);

        results.categories = {
          [this.resultCategories.USERS]: users,
          [this.resultCategories.POSTS]: feed,
          [this.resultCategories.PRODUCTS]: marketplace,
          [this.resultCategories.VIDEOS]: videos,
        };

        results.totalResults =
          users.totalCount +
          feed.totalCount +
          marketplace.totalCount +
          videos.totalCount;
      } else {
        let searchResult;
        switch (searchType) {
          case this.searchTypes.USERS:
            searchResult = await this.searchUsers({
              query,
              currentUserId,
              page,
              limit,
              sortBy,
            });
            results.categories[this.resultCategories.USERS] = searchResult;
            break;
          case this.searchTypes.FEED:
            searchResult = await this.searchFeed({
              query,
              currentUserId,
              page,
              limit,
              sortBy,
            });
            results.categories[this.resultCategories.POSTS] = searchResult;
            break;
          case this.searchTypes.MARKETPLACE:
            searchResult = await this.searchMarketplace({
              query,
              currentUserId,
              page,
              limit,
              sortBy,
              filters,
            });
            results.categories[this.resultCategories.PRODUCTS] = searchResult;
            break;
          case this.searchTypes.VIDEOS:
            searchResult = await this.searchVideos({
              query,
              currentUserId,
              page,
              limit,
              sortBy,
            });
            results.categories[this.resultCategories.VIDEOS] = searchResult;
            break;
        }
        results.totalResults = searchResult?.totalCount || 0;
      }

      return results;
    } catch (error) {
      console.error("Global search error:", error);
      throw error;
    }
  }

  async searchUsers({
    query,
    currentUserId,
    page = 1,
    limit = 10,
    sortBy = "relevance",
  }) {
    try {
      const skip = (page - 1) * limit;
      const sanitizedQuery = sanitizeQuery(query);

      if (!sanitizedQuery) {
        return { items: [], totalCount: 0, hasMore: false };
      }

      const pipeline = [
        {
          $match: {
            _id: { $ne: currentUserId },
            $or: [
              { firstName: { $regex: sanitizedQuery, $options: "i" } },
              { lastName: { $regex: sanitizedQuery, $options: "i" } },
              { userName: { $regex: sanitizedQuery, $options: "i" } },
              {
                $expr: {
                  $regexMatch: {
                    input: { $concat: ["$firstName", " ", "$lastName"] },
                    regex: sanitizedQuery,
                    options: "i",
                  },
                },
              },
            ],
          },
        },
        {
          $addFields: {
            fullName: { $concat: ["$firstName", " ", "$lastName"] },
            relevanceScore: {
              $add: [
                {
                  $cond: [
                    {
                      $eq: [
                        { $toLower: "$userName" },
                        sanitizedQuery.toLowerCase(),
                      ],
                    },
                    100,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $toLower: "$userName" },
                        regex: `^${sanitizedQuery.toLowerCase()}`,
                      },
                    },
                    70,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $eq: [
                        {
                          $toLower: {
                            $concat: ["$firstName", " ", "$lastName"],
                          },
                        },
                        sanitizedQuery.toLowerCase(),
                      ],
                    },
                    90,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $toLower: "$firstName" },
                        regex: `^${sanitizedQuery.toLowerCase()}`,
                      },
                    },
                    40,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $toLower: "$lastName" },
                        regex: `^${sanitizedQuery.toLowerCase()}`,
                      },
                    },
                    40,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: {
                          $toLower: {
                            $concat: ["$firstName", " ", "$lastName"],
                          },
                        },
                        regex: sanitizedQuery.toLowerCase(),
                      },
                    },
                    25,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $toLower: "$userName" },
                        regex: sanitizedQuery.toLowerCase(),
                      },
                    },
                    15,
                    0,
                  ],
                },
              ],
            },
          },
        },
        {
          $sort:
            sortBy === "recent"
              ? { createdAt: -1 }
              : { relevanceScore: -1, createdAt: -1 },
        },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            userName: 1,
            bio: 1,
            profilePicture: 1,
            createdAt: 1,
            relevanceScore: 1,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ];

      const [users, totalCount] = await Promise.all([
        User.aggregate(pipeline),
        User.countDocuments({
          _id: { $ne: currentUserId },
          $or: [
            { firstName: { $regex: sanitizedQuery, $options: "i" } },
            { lastName: { $regex: sanitizedQuery, $options: "i" } },
            { userName: { $regex: sanitizedQuery, $options: "i" } },
            {
              $expr: {
                $regexMatch: {
                  input: { $concat: ["$firstName", " ", "$lastName"] },
                  regex: sanitizedQuery,
                  options: "i",
                },
              },
            },
          ],
        }),
      ]);

      const userIds = users.map((user) => user._id);
      const friendRequests = await FriendRequests.find({
        $or: [
          { senderId: currentUserId, receiverId: { $in: userIds } },
          { receiverId: currentUserId, senderId: { $in: userIds } },
        ],
      });

      const relationshipMap = {};
      friendRequests.forEach((request) => {
        const otherUserId =
          request.senderId.toString() === currentUserId.toString()
            ? request.receiverId.toString()
            : request.senderId.toString();

        if (request.status === FRIEND_REQUEST_STATUS.Accepted) {
          relationshipMap[otherUserId] = "friend";
        } else if (request.status === FRIEND_REQUEST_STATUS.Pending) {
          relationshipMap[otherUserId] =
            request.senderId.toString() === currentUserId.toString()
              ? "request_sent"
              : "request_received";
        }
      });

      const usersWithRelationship = users.map((user) => ({
        ...user,
        relationshipStatus: relationshipMap[user._id.toString()] || "none",
        resultType: this.resultCategories.USERS,
      }));

      return {
        items: usersWithRelationship,
        totalCount,
        hasMore: skip + users.length < totalCount,
      };
    } catch (error) {
      console.error("User search error:", error);
      throw error;
    }
  }

  async searchFeed({
    query,
    currentUserId,
    page = 1,
    limit = 10,
    sortBy = "relevance",
  }) {
    try {
      const skip = (page - 1) * limit;
      const sanitizedQuery = sanitizeQuery(query);

      if (!sanitizedQuery) {
        return { items: [], totalCount: 0, hasMore: false };
      }

      const pipeline = [
        {
          $match: {
            content: { $regex: sanitizedQuery, $options: "i" },
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "author",
          },
        },
        {
          $unwind: "$author",
        },
        {
          $addFields: {
            relevanceScore: {
              $add: [
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $toLower: "$content" },
                        regex: `^${sanitizedQuery.toLowerCase()}`,
                      },
                    },
                    50,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $toLower: "$content" },
                        regex: sanitizedQuery.toLowerCase(),
                      },
                    },
                    20,
                    0,
                  ],
                },
                { $multiply: [{ $size: { $ifNull: ["$likes", []] } }, 2] },
                {
                  $cond: [
                    {
                      $gte: [
                        "$createdAt",
                        {
                          $dateSubtract: {
                            startDate: "$$NOW",
                            unit: "day",
                            amount: 7,
                          },
                        },
                      ],
                    },
                    10,
                    0,
                  ],
                },
              ],
            },
            likesCount: { $size: { $ifNull: ["$likes", []] } },
            isLikedByUser: {
              $in: [currentUserId, { $ifNull: ["$likes", []] }],
            },
          },
        },
        {
          $sort:
            sortBy === "recent"
              ? { createdAt: -1 }
              : sortBy === "popular"
              ? { likesCount: -1, createdAt: -1 }
              : { relevanceScore: -1, createdAt: -1 },
        },
        {
          $project: {
            content: 1,
            media: 1,
            createdAt: 1,
            likesCount: 1,
            isLikedByUser: 1,
            relevanceScore: 1,
            "author._id": 1,
            "author.firstName": 1,
            "author.lastName": 1,
            "author.userName": 1,
            "author.profilePicture": 1,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ];

      const [posts, totalCount] = await Promise.all([
        Feed.aggregate(pipeline),
        Feed.countDocuments({
          content: { $regex: sanitizedQuery, $options: "i" },
        }),
      ]);

      const postsWithType = posts.map((post) => ({
        ...post,
        resultType: this.resultCategories.POSTS,
      }));

      return {
        items: postsWithType,
        totalCount,
        hasMore: skip + posts.length < totalCount,
      };
    } catch (error) {
      console.error("Feed search error:", error);
      throw error;
    }
  }

  async searchMarketplace({
    query,
    currentUserId,
    page = 1,
    limit = 10,
    sortBy = "relevance",
    filters = {},
  }) {
    try {
      const skip = (page - 1) * limit;

      const matchStage = {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { category: { $regex: query, $options: "i" } },
        ],
      };

      if (filters.category) {
        matchStage.category = filters.category;
      }
      if (filters.minPrice || filters.maxPrice) {
        matchStage.price = {};
        if (filters.minPrice)
          matchStage.price.$gte = parseFloat(filters.minPrice);
        if (filters.maxPrice)
          matchStage.price.$lte = parseFloat(filters.maxPrice);
      }

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "seller",
          },
        },
        {
          $unwind: { path: "$seller", preserveNullAndEmptyArrays: true },
        },
        {
          $addFields: {
            relevanceScore: {
              $add: [
                {
                  $cond: [
                    { $eq: [{ $toLower: "$name" }, query.toLowerCase()] },
                    100,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $toLower: "$name" },
                        regex: `^${query.toLowerCase()}`,
                      },
                    },
                    50,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $toLower: "$description" },
                        regex: query.toLowerCase(),
                      },
                    },
                    20,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $toLower: "$category" },
                        regex: query.toLowerCase(),
                      },
                    },
                    30,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $gte: [
                        "$createdAt",
                        {
                          $dateSubtract: {
                            startDate: "$$NOW",
                            unit: "day",
                            amount: 30,
                          },
                        },
                      ],
                    },
                    5,
                    0,
                  ],
                },
              ],
            },
          },
        },
        {
          $sort:
            sortBy === "recent"
              ? { createdAt: -1 }
              : sortBy === "price_low"
              ? { price: 1 }
              : sortBy === "price_high"
              ? { price: -1 }
              : { relevanceScore: -1, createdAt: -1 },
        },
        {
          $project: {
            name: 1,
            description: 1,
            price: 1,
            category: 1,
            images: 1,
            createdAt: 1,
            relevanceScore: 1,
            "seller._id": 1,
            "seller.firstName": 1,
            "seller.lastName": 1,
            "seller.userName": 1,
            "seller.profilePicture": 1,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ];

      const [products, totalCount] = await Promise.all([
        MarketPlace.aggregate(pipeline),
        MarketPlace.countDocuments(matchStage),
      ]);

      const productsWithType = products.map((product) => ({
        ...product,
        category: this.categoryLabels[product.category] || product.category,
        resultType: this.resultCategories.PRODUCTS,
      }));

      return {
        items: productsWithType,
        totalCount,
        hasMore: skip + products.length < totalCount,
      };
    } catch (error) {
      console.error("Marketplace search error:", error);
      throw error;
    }
  }

  async searchVideos({
    query,
    currentUserId,
    page = 1,
    limit = 10,
    sortBy = "relevance",
  }) {
    try {
      const skip = (page - 1) * limit;

      const pipeline = [
        {
          $match: {
            $or: [
              { title: { $regex: query, $options: "i" } },
              { description: { $regex: query, $options: "i" } },
            ],
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "creator",
          },
        },
        {
          $unwind: "$creator",
        },
        {
          $addFields: {
            relevanceScore: {
              $add: [
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $toLower: "$title" },
                        regex: `^${query.toLowerCase()}`,
                      },
                    },
                    50,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $toLower: "$title" },
                        regex: query.toLowerCase(),
                      },
                    },
                    30,
                    0,
                  ],
                },
                {
                  $cond: [
                    {
                      $regexMatch: {
                        input: { $toLower: "$description" },
                        regex: query.toLowerCase(),
                      },
                    },
                    20,
                    0,
                  ],
                },
                { $multiply: [{ $size: { $ifNull: ["$likes", []] } }, 3] },
                { $divide: ["$views", 10] },
                {
                  $cond: [
                    {
                      $gte: [
                        "$createdAt",
                        {
                          $dateSubtract: {
                            startDate: "$$NOW",
                            unit: "day",
                            amount: 7,
                          },
                        },
                      ],
                    },
                    15,
                    0,
                  ],
                },
              ],
            },
            likesCount: { $size: { $ifNull: ["$likes", []] } },
            isLikedByUser: {
              $in: [currentUserId, { $ifNull: ["$likes", []] }],
            },
            isSavedByUser: {
              $in: [currentUserId, { $ifNull: ["$isSaved", []] }],
            },
          },
        },
        {
          $sort:
            sortBy === "recent"
              ? { createdAt: -1 }
              : sortBy === "popular"
              ? { views: -1, likesCount: -1 }
              : sortBy === "most_liked"
              ? { likesCount: -1, views: -1 }
              : { relevanceScore: -1, createdAt: -1 },
        },
        {
          $project: {
            title: 1,
            description: 1,
            video: 1,
            views: 1,
            createdAt: 1,
            likesCount: 1,
            isLikedByUser: 1,
            isSavedByUser: 1,
            relevanceScore: 1,
            "creator._id": 1,
            "creator.firstName": 1,
            "creator.lastName": 1,
            "creator.userName": 1,
            "creator.profilePicture": 1,
          },
        },
        { $skip: skip },
        { $limit: limit },
      ];

      const [videos, totalCount] = await Promise.all([
        Videos.aggregate(pipeline),
        Videos.countDocuments({
          $or: [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
          ],
        }),
      ]);

      const videosWithType = videos.map((video) => ({
        ...video,
        resultType: this.resultCategories.VIDEOS,
      }));

      return {
        items: videosWithType,
        totalCount,
        hasMore: skip + videos.length < totalCount,
      };
    } catch (error) {
      console.error("Videos search error:", error);
      throw error;
    }
  }

  async getSearchSuggestions({ query, currentUserId, limit = 5 }) {
    try {
      const sanitizedQuery = sanitizeQuery(query);

      const suggestions = {
        users: [],
        hashtags: [],
        recent: [],
      };

      if (!sanitizedQuery) {
        return suggestions;
      }

      const userSuggestions = await User.find({
        _id: { $ne: currentUserId },
        $or: [
          { firstName: { $regex: `^${sanitizedQuery}`, $options: "i" } },
          { lastName: { $regex: `^${sanitizedQuery}`, $options: "i" } },
          { userName: { $regex: `^${sanitizedQuery}`, $options: "i" } },
        ],
      })
        .select("firstName lastName userName profilePicture")
        .limit(limit);

      suggestions.users = userSuggestions.map((user) => ({
        type: "user",
        text: `${user.firstName} ${user.lastName}`,
        username: user.userName,
        avatar: user.profilePicture?.url,
      }));

      return suggestions;
    } catch (error) {
      console.error("Search suggestions error:", error);
      throw error;
    }
  }
}

export const globalSearchService = new GlobalSearchService();
