import User from '../models/User.js';
import { verifyAccessToken, extractTokenFromHeader } from '../utils/jwtService.js';

const authenticateToken = async (req, res, next) => {
    try {
        const token = extractTokenFromHeader(req.headers['authorization']);

        if (!token) {
            return res.status(401).json({ 
                error: 'Access token required',
                code: 'MISSING_TOKEN'
            });
        }

        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.userId).select('-passwordHash -refreshTokens');

        if (!user) {
            return res.status(401).json({ 
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        if (error.message === 'Invalid token type') {
            return res.status(401).json({ 
                error: 'Invalid token type',
                code: 'INVALID_TOKEN_TYPE'
            });
        }
        console.error('Authentication error:', error);
        return res.status(500).json({ 
            error: 'Authentication error',
            code: 'AUTH_ERROR'
        });
    }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const token = extractTokenFromHeader(req.headers['authorization']);

        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.userId).select('-passwordHash -refreshTokens');

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        // For optional auth, we don't fail on token errors
        req.user = null;
        next();
    }
};

export { authenticateToken, optionalAuth };