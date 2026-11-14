import CustomProduct from '@/models/CustomProduct';
import { escapeRegex } from '@/lib/food-diary';

/**
 * Products already in the shared, AI-sourced cache whose name contains `query`.
 * Athletes only see this global cache, not trainers' private products.
 * Expects an open database connection.
 */
export function findCachedProducts(query: string, limit = 20) {
    return CustomProduct.find({
        name: { $regex: escapeRegex(query), $options: 'i' },
        source: 'ai',
    })
        .sort({ createdAt: -1 })
        .limit(limit);
}
