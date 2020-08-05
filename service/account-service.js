const {Post} = require('./../model/post');
const {getCurrentDateTimeJson,} = require('./../utils/utils');
const {getCategoryElement, Constant} = require('./../service/categories-service');
const {loadChannels} = require('./../service/channel-service');

let importAccounts = async (file, user, account, shouldRegister, onlyFavourite) => {
    try {
        let posts = [];
        let attributes = [];
        let post = {};
        let emailReq = "(?:[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*|\"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])*\")@(?:(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\\.)+[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?|\\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[A-Za-z0-9-]*[A-Za-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\\]):(?:[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*|\"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\\\[\x01-\x09\x0b\x0c\x0e-\x7f])*\")";
        let emailFinder = new RegExp(emailReq);
        let array = file.data.toString('utf8').split("\n");
        array.forEach((line) => {

            line = line.trim();
            if (line !== '') {
                if (emailFinder.test(line)) {
                    // fillContent(post);
                    post.done = false;
                    post = {};
                    post.startGame = false;
                    post.favourite = false;
                    post.content = '';
                    post.originalContent = '';
                    post.lines = line + '\n';
                    attributes = [];
                    attributes.push(
                        {
                            title: 'Info',
                            value: line
                        }
                    );
                    post.attributes = attributes;
                    posts.push(post);
                } else if (line.includes("PS PLUS")) {
                    post.lines += line + '\n';
                    if (line.includes("NoPlus")) {
                        post.plus = "❌ plus\n";
                    } else {
                        post.plus = "✅ plus\n";
                    }
                } else if (line.includes("Country")) {
                    post.lines += line + '\n';
                    if (line.includes("US") || line.includes("CA") || line.includes("UY") || line.includes("AR")) {
                        post.region = "1";
                    } else if (line.includes("JP")
                        || line.includes("NL")
                        || line.includes("PL")
                        || line.includes("GB")
                        || line.includes("PT")
                        || line.includes("DE")
                        || line.includes("ES")
                        || line.includes("FR")
                        || line.includes("IT")
                        || line.includes("SE")
                    ) {
                        post.region = "2";
                    } else if (
                        line.includes("SA")
                        || line.includes("CY")
                        || line.includes("SG")
                    ) {
                        post.region = "3";
                    } else if (line.includes("AU")) {
                        post.region = "4";

                    } else if (line.includes("RU")) {
                        post.region = "5";
                    } else {
                        post.region = "2";
                    }
                    post.country = line.substr(line.indexOf(":") + 1, 3).trim() + '\n';

                } else if (line.includes("================TRANSACTIONS================")) {
                    post.lines += line + '\n';
                    post.startGame = true;
                } else if (post.startGame && (line.includes("================TRANSACTIONS END============") || line.includes("========================================="))) {
                    post.lines += line + '\n';
                    post.originalContent = "************************\n" + post.content + "<p><br></p>" + "************************\n" +
                        "🌐Region " + post.region + "\xa0" + post.country.toUpperCase() + post.plus + "✔️Original Email\n" +
                        "⚙️Z2" + "\n" + "<p><br></p>"
                        + "💵" + "10,000" + "\xa0" + "IDPAY" + "\n" + "💰" +
                        "$" + 1 + "\xa0" + "WMZ/BTC" + "\n************************\n" + "<p><br></p>" + "💚 Trust => @EpicGameTrust 💚" + "<p><br></p>";

                    post.content = convert(post.originalContent);
                    post.done = true;
                } else if (post.startGame) {
                    post.lines += line + '\n';
                    if (line.includes("eFootball  PES 2020") || line.includes("EA SPORTS™ FIFA 20 ")
                        || line.includes("The Last of Us Part II")
                        || line.includes("Call of Duty®: Modern Warfare")
                        || line.includes("Need for Speed™ Heat")
                        || line.includes("WWE 2K20")
                        || line.includes("Mortal Kombat 11")
                        || line.includes("Ghost of Tsushima")
                        || line.includes("DOOM Eternal")
                        || line.includes("Crash™ Team Racing Nitro-Fueled")
                        || line.includes("Just Dance 2020")
                        || line.includes("DEATH STRANDING")
                        || line.includes("Metro Exodus")
                        || line.includes("Battlefield™ V")
                        || line.includes("Sekiro™")
                        || line.includes("Red Dead Redemption 2™")
                        || line.includes("World War Z")
                        || line.includes("Days Gone")
                        || line.includes("A Way Out")
                        || line.includes("EA Sports UFC 4")
                        || line.includes("PlayerUnknown's Battlegrounds")
                        || line.includes("Devil May Cry 5")
                        || line.includes("Resident Evil 2")
                        || line.includes("Resident Evil 3")
                        || line.includes("Far Cry New Dawn")
                    ) {
                        post.hasGoodGame = true;
                        post.favourite = true;
                    } else {

                    }
                    post.content += line + "\n";
                }
            }
        });
        fillContent(post);

        let status = getCategoryElement(Constant.REGISTERED_POST_STATUS);
        let lastIdentifier = await Post.findNextIdentifier(user);
        let lastlines = "";
        await posts.forEach(async (item, index) => {
            if ((onlyFavourite && item.favourite) || (!onlyFavourite && !item.favourite)) {
                lastlines += item.lines;
            }

            if (shouldRegister) {
                let channels = await loadChannels(user, [
                    {"username": "-1001273017531"},
                    {"username": "@egseller_shop"}
                ]);


                item.creationDateTime = getCurrentDateTimeJson();
                item.lastUpdateDateTime = getCurrentDateTimeJson();
                item.user = user;
                item.account = account;
                item.identifier = lastIdentifier + index;
                item.status = status;
                item.channels = channels;

                let post = new Post(item);
                await post.save();
            }
        });
        return Promise.resolve(lastlines)
    } catch (e) {
        console.log(e)
        return Promise.reject(e)
    }
};


let fillContent = (post) => {
    if (post.attributes !== undefined && post.attributes.length === 1 && !post.done) {
        post.originalContent = '************************\n' +
            "🌐" + "1" + "\xa0" + "US" + "\n" + "❌ plus\n" + "\n" +
            "✔️Original Email\n" +
            "⚙️Z2" + "\n" + "<p><br></p>"
            + "💵" + "10,000" + "\xa0" + "IDPAY" + "\n" + "💰" +
            "$" + 1 + "\xa0" + "WMZ/BTC" + "\n************************\n" + "<p><br></p>" + "💚 Trust => @EpicGameTrust 💚" + "<p><br></p>";

        post.content = convert(post.originalContent);
    }
};

let convert = (original) => {
    return original.toString()
        .split("<div></div>").join("")
        .replace(/<div><\s*a[^>]*>/gi, "")
        .split("</a></div>").join("\n")
        .replace(/<\s*a[^>]*>/gi, "")
        .replace(/<\s*span[^>]*>/gi, "")
        .split("</a>").join("")
        .split("</span>").join("")
        .split("<h1>").join("")
        .split("<h2>").join("<p>")
        .split("<h3>").join("<p>")
        .split("<h4>").join("<p>")
        .split("<h5>").join("<p>")
        .split("<h6>").join("<p>")
        .split("<h7>").join("<p>")
        .split("</h1>").join("\n")
        .split("</h2>").join("</p>")
        .split("</h3>").join("</p>")
        .split("</h4>").join("</p>")
        .split("</h5>").join("</p>")
        .split("</h6>").join("</p>")
        .split("</h7>").join("</p>")
        .split("<div>").join("<p>")
        .split("</div>").join("</p>")
        .split("<p><br></p>").join("\n")
        .split("<em><br></em>").join("")
        .split("<ins><br></ins>").join("")
        .split("<strong><br></strong>").join("")
        .split("<del><br></del>").join("")
        .split("<em></em>").join("")
        .split("<ins></ins>").join("")
        .split("<strong></strong>").join("")
        .split("<del></del>").join("")
        .split("<div></div>").join("")
        .split("<p></p>").join("")
        .split("<p>").join("")
        .split("</p>").join("\n")
        .split("<br>").join("")
        .split("&nbsp;").join(" ");
};

module.exports = {
    importAccounts
};