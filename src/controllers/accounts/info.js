"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotes = void 0;
const database_1 = __importDefault(require("../../database"));
const user_1 = __importDefault(require("../../user"));
const helpers_1 = __importDefault(require("../helpers"));
const helpers_2 = __importDefault(require("./helpers"));
const pagination_1 = __importDefault(require("../../pagination"));
function getNotes(userData, start, stop) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!userData.isAdminOrGlobalModeratorOrModerator) {
            return;
        }
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const [notes, count] = yield Promise.all([
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            user_1.default.getModerationNotes(userData.uid, start, stop),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            database_1.default.sortedSetCard(`uid:${userData.uid}:moderation:notes`),
        ]);
        // line 50's source file has the types in db. therefore have disabled
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        return { notes: notes, count: count };
    });
}
exports.getNotes = getNotes;
function get(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        // eslint-disable-next-line max-len
        const userData = yield helpers_2.default.getUserDataByUserSlug(req.params.userslug, req.uid, req.query);
        if (!userData) {
            return next();
        }
        const page = Math.max(1, req.query.page || 1);
        const itemsPerPage = 10;
        const start = (page - 1) * itemsPerPage;
        const stop = start + itemsPerPage - 1;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const [history, sessions, usernames, emails, notes] = yield Promise.all([
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            user_1.default.getModerationHistory(userData.uid),
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            user_1.default.auth.getSessions(userData.uid, req.sessionID),
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
            user_1.default.getHistory(`user:${userData.uid}:usernames`),
            // eslint-disable-next-line max-len
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions
            user_1.default.getHistory(`user:${userData.uid}:emails`),
            getNotes(userData, start, stop),
        ]);
        userData.history = history;
        userData.sessions = sessions;
        userData.usernames = usernames;
        userData.emails = emails;
        if (userData.isAdminOrGlobalModeratorOrModerator) {
            userData.moderationNotes = notes.notes;
            const pageCount = Math.ceil(notes.count / itemsPerPage);
            userData.pagination = pagination_1.default.create(page, pageCount, req.query);
        }
        userData.title = '[[pages:account/info]]';
        userData.breadcrumbs = helpers_1.default.buildBreadcrumbs([{ text: userData.username, url: `/user/${userData.userslug}` }, { text: '[[user:account_info]]' }]);
        res.render('account/info', userData);
    });
}
exports.default = get;
