node {
    stage('Clone repo') {
        checkout scm
    }
    stage('Unit test') {
        environment {
                APPLICATION_ID=0xf0c34a721e1bb7606de33a6e44ab30698e8076d7bb5c0b11d108aa52a5de0337
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
