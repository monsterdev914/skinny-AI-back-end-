"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
class UserController {
    static async getProfile(req, res) {
        return res.json({
            success: true,
            message: 'Profile retrieved successfully',
            data: { user: req.user }
        });
    }
    static async updateProfile(_req, res) {
        return res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    }
}
exports.UserController = UserController;
//# sourceMappingURL=user.js.map