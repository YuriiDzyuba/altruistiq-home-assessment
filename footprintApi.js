import axios from 'axios'

/**
 * @typedef {Object} Country
 * @property {number} countryCode
 * @property {string} countryName
 * @property {string} shortName
 * @property {string} isoa2
 */

/**
 * @typedef {Object} CountryData
 * @property {number} year
 * @property {number} countryCode
 * @property {string} countryName
 * @property {string} shortName
 * @property {string} isoa2
 * @property {number} cropLand
 * @property {number} grazingLand
 * @property {number} forestLand
 * @property {number} fishingGround
 * @property {number} builtupLand
 * @property {number} carbon
 * @property {number} value
 * @property {string} score
 */

export default {
  get(apiUrl) {
    return axios.get(apiUrl, {
      auth: {
        username: 'any-user-name',
        password: process.env.API_KEY
      }
    })
  },

  /**
   * Fetches all countries.
   * @returns {Promise<Array<Country>>}
   * A promise that resolves to an array of country objects.
   */
  async getCountries() {
    const resp = await this.get('https://api.footprintnetwork.org/v1/countries')
    return resp.data
  },

  /**
   * Fetches country detail from the API by country code.
   * @returns {Promise<Array<CountryData>>}
   */
  async getDataForCountry(countryCode) {
    const resp = await this.get(`https://api.footprintnetwork.org/v1/data/${countryCode}/all/EFCpc`)
    return resp.data
  }
}
