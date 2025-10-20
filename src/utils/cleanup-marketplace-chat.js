// Database cleanup utility
// Run this once to fix the duplicate index issue

import mongoose from "mongoose";

export async function cleanupMarketplaceChatIndex() {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      console.log("Database not connected");
      return;
    }

    const collection = db.collection("marketplacechats");

    console.log("Checking marketplace chat indexes...");

    // List current indexes
    const indexes = await collection.listIndexes().toArray();
    console.log("Current indexes:");
    indexes.forEach((index) => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Check for the problematic index pattern
    const problematicIndexes = indexes.filter(
      (index) =>
        index.name &&
        (index.name.includes("productId_1_buyer_1_seller_1") ||
          index.name.includes("buyer_1_seller_1") ||
          (index.key &&
            (index.key.productId || index.key.buyer || index.key.seller)))
    );

    if (problematicIndexes.length > 0) {
      console.log("\nFound problematic indexes:");
      problematicIndexes.forEach((index) => console.log(`- ${index.name}`));

      // You can uncomment these lines to actually drop the indexes
      // for (const index of problematicIndexes) {
      //   try {
      //     await collection.dropIndex(index.name);
      //     console.log(`Dropped index: ${index.name}`);
      //   } catch (error) {
      //     console.log(`Error dropping ${index.name}:`, error.message);
      //   }
      // }
    }

    // Remove any documents with problematic null values
    const problematicDocs = await collection
      .find({
        $or: [
          { productId: null, buyer: null, seller: null },
          { productRef: null },
          { participants: { $in: [null, []] } },
          { participants: { $size: 0 } },
        ],
      })
      .toArray();

    console.log(
      `\nFound ${problematicDocs.length} documents with problematic data`
    );

    if (problematicDocs.length > 0) {
      // You can uncomment this line to actually delete the problematic documents
      // const deleteResult = await collection.deleteMany({
      //   $or: [
      //     { productId: null, buyer: null, seller: null },
      //     { productRef: null },
      //     { participants: { $in: [null, []] } },
      //     { participants: { $size: 0 } }
      //   ]
      // });
      // console.log(`Deleted ${deleteResult.deletedCount} problematic documents`);
    }

    console.log("\nCleanup analysis complete");
    console.log(
      "To actually perform the cleanup, uncomment the relevant lines in the script"
    );
  } catch (error) {
    console.error("Error during cleanup:", error);
  }
}

// Export for use in your main app
export default cleanupMarketplaceChatIndex;
