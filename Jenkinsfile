node {
    stage('Clone repo') {
        checkout scm
    }
    stage('Unit test') {
        environment {
                API_PRIVATE_KEY=credentials('API_AUTHORISATION_PRIVATE_KEY')
                API_TAR_ID='0x0000000000000000000000000000000000000000000000000000000000000000'
                API_DID='did:ebsi:BdFneNpniW3DE639yY6sEga9GhwdZ3jSdfJ1EyURMPx5'
        }
        withCredentials([string(credentialsId: 'API_PRIVATE_KEY_AUTHORISATION', variable: 'API_PRIVATE_KEY')]) {
            nodejs(nodeJSInstallationName: '14.15.4') {
                sh 'yarn install --frozen-lockfile'
                sh 'yarn run audit'
                sh 'yarn lint'
                sh 'yarn test:ci'
            }
        }
    }
    ebsi_deploy("clone_repo": false)
}
