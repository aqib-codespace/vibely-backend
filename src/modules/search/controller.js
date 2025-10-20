import { globalSearchService } from "./services.js";
import {
  globalSearchValidation,
  searchSuggestionsValidation,
} from "./validations.js";
import apiError from "../../utils/apiError.js";

export const globalSearch = async (req, res, next) => {
  try {
    const { error, value } = globalSearchValidation.validate(req.query);
    if (error) {
      return next(apiError.badRequest(error.details[0].message));
    }

    const {
      q: query,
      type: searchType,
      page,
      limit,
      sortBy,
      category,
      minPrice,
      maxPrice,
    } = value;

    const currentUserId = req.user._id;
    const filters = {};
    if (category) filters.category = category;
    if (minPrice) filters.minPrice = minPrice;
    if (maxPrice) filters.maxPrice = maxPrice;

    const searchResults = await globalSearchService.globalSearch({
      query,
      currentUserId,
      searchType,
      page,
      limit,
      sortBy,
      filters,
    });

    const responseTime = Date.now() - req.startTime;

    return res.status(200).json({
      success: true,
      message: `Search completed successfully. Found ${searchResults.totalResults} results.`,
      data: searchResults,
      meta: {
        responseTime: `${responseTime}ms`,
        searchTerms: query.split(" ").length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Global search error:", error);
    next(apiError.internal("Failed to perform search"));
  }
};

export const getSearchSuggestions = async (req, res, next) => {
  try {
    const { error, value } = searchSuggestionsValidation.validate(req.query);
    if (error) {
      return next(apiError.badRequest(error.details[0].message));
    }

    const { q: query, limit } = value;
    const currentUserId = req.user._id;

    const suggestions = await globalSearchService.getSearchSuggestions({
      query,
      currentUserId,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Search suggestions retrieved successfully",
      data: suggestions,
    });
  } catch (error) {
    console.error("Search suggestions error:", error);
    next(apiError.internal("Failed to get search suggestions"));
  }
};
