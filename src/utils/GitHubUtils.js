import axios from 'axios'

const stargazersURL = "https://api.github.com/repos/{user}/{repo}/stargazers?per_page=100&page={page}"
const validateAccessTokenURL = "https://api.github.com/user"

const storageKey = "access_token"

export const StorageTypes = {
  LocalStorage: 'local',
  SessionStorage: 'session'
}

class GitHubUtils {

  static _storage = sessionStorage;

  async validateAndStoreAccessToken(accessToken, storageType) {
    try {
      await axios.get(validateAccessTokenURL, this._prepareRequestHeaders(accessToken));
      this._setStorageType(storageType).setItem(storageKey, accessToken);
    }
    catch (error) {
      console.log(error)
      throw error;
    }
  }

  removeAccessToken() {
    this._getStorageType().removeItem(storageKey)
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async loadStargazers(user, repo, handleProgress) {
    try {
      let starData = [];
      let starCount = 1;
      let numOfPages = 1;
      let pageNum = 1;
      handleProgress(0);
      while (pageNum <= numOfPages) {
        let url = stargazersURL.replace('{page}', pageNum).replace('{user}', user).replace('{repo}', repo);
        let page = await axios.get(url, this._prepareRequestHeaders(this.getAccessToken()));
        if (pageNum === 1) {
          numOfPages = this._getLastStargazerPage(page.headers['link']);
        }
        handleProgress((pageNum/numOfPages)*100);
        pageNum++;

        page.data.forEach( (singleStarData) => {
          starData.push({
            x: singleStarData.starred_at,
            y: starCount++
          })
        });
      }

      return starData;
    }
    catch(error) {
      if (error.response.status === 404) {
        throw Error("Repo " + user + "/" + repo + " Not found")
      } else {
        throw Error("Couldn't fetch stargazers data, error code " + error.response.status + " returned" + 
          (error.response.data.message && error.response.data.message !== "" ? ": " + error.response.data.message : ""))
      }
    }
  }

  getAccessToken() {
    return this._getStorageType().getItem(storageKey);
  }

  getAccessTokenShortForm() {
    let token = this.getAccessToken();
    if (token !== undefined)
      return this.getAccessToken().substring(0, 6);
    
    return ""
  }

  _getStorageType() {
    return GitHubUtils._storage
  }

  _setStorageType(storageType) {
    this.removeAccessToken();

    switch (storageType) {
      case StorageTypes.LocalStorage:
        GitHubUtils._storage = localStorage;
        break;
      case StorageTypes.SessionStorage:
        GitHubUtils._storage = sessionStorage
        break;
      default:
        GitHubUtils._storage = sessionStorage
    }

    return GitHubUtils._storage
  }

  _prepareRequestHeaders(accessToken) {
    return {
      headers: {
        'Accept': 'application/vnd.github.v3.star+json',
        ...accessToken !== undefined && accessToken !== null && accessToken !== "" && {'Authorization': 'token ' + accessToken},
      }
    };

  }

  _getLastStargazerPage(linkHeader) {
    if (linkHeader === undefined || linkHeader.length === 0) {
      return 1;
    }
  
    // Split parts by comma
    var parts = linkHeader.split(',');
  
    // Parse each part into a named link
    for (let i in parts) {
      var section = parts[i].split(';');
      if (section.length !== 2) {
        continue;
      }
  
      var url = section[0].replace(/<(.*)>/, '$1').trim();
      var name = section[1].replace(/rel="(.*)"/, '$1').trim();
  
      // if name is 'last' then extract page and return it
      if (name === 'last') {
        return url.replace(/(.*)&page=(.*)/, '$2').trim();
      }
    }
  }

}

const gitHubUtils = new GitHubUtils();
Object.freeze(gitHubUtils);

export default gitHubUtils;